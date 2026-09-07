import numpy as np
from sklearn.cluster import KMeans, DBSCAN

IS_SKLEARN_HDBSCAN = False
try:
    from sklearn.cluster import HDBSCAN
    IS_SKLEARN_HDBSCAN = True
except ImportError:
    try:
        import hdbscan
        HDBSCAN = hdbscan.HDBSCAN
        IS_SKLEARN_HDBSCAN = False
    except ImportError:
        HDBSCAN = None

from sklearn.preprocessing import normalize
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import silhouette_score
from typing import Dict, List, Optional
from fastapi import HTTPException
import logging

logger = logging.getLogger("clustering")

def _create_hdbscan_instance(min_cluster_size: int, min_samples: int):
    kwargs = {
        "min_cluster_size": min_cluster_size,
        "min_samples": min_samples,
        "metric": "euclidean"
    }
    if IS_SKLEARN_HDBSCAN:
        kwargs["copy"] = True
    return HDBSCAN(**kwargs)

def run_clustering(
    embeddings: List[List[float]],
    vector_ids: List[str],
    method: str = "kmeans",
    n_clusters: int = 5,
    eps: float = 0.5,
    min_samples: int = 5,
    min_cluster_size: int = 5
) -> Dict[str, int]:
    """
    Runs clustering on the provided high-dimensional embeddings.
    Supports:
      - kmeans: with manual K or automatic Silhouette-optimal K discovery (when n_clusters <= 0)
      - dbscan: with manual or auto-estimated cosine epsilon (when eps <= 0)
      - hdbscan: hierarchical density-based clustering with automatic cluster discovery and noise isolation
    Returns a dictionary mapping vector ID to integer cluster label.
    """
    X = np.array(embeddings, dtype=np.float32)
    n_samples = X.shape[0]

    if n_samples == 0:
        return {}

    method = method.lower().strip()
    if method not in ["kmeans", "dbscan", "hdbscan", "hbdscan"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported clustering method '{method}'. Supported methods are 'kmeans', 'dbscan', and 'hdbscan'."
        )

    if n_samples == 1:
        return {vector_ids[0]: 0}

    # L2 normalize embeddings so directional/cosine similarity is preserved uniformly
    X_norm = normalize(X, norm="l2")

    # 1. K-MEANS
    if method == "kmeans":
        if n_clusters <= 0:
            # Auto-detect optimal clusters using Silhouette Analysis
            if n_samples < 3:
                adjusted_clusters = max(1, min(2, n_samples))
                kmeans = KMeans(n_clusters=adjusted_clusters, n_init=10, random_state=42)
                labels = kmeans.fit_predict(X_norm)
            else:
                best_k = 2
                best_score = -1.0
                max_k = min(15, n_samples - 1)

                if max_k < 2:
                    adjusted_clusters = max(1, min(2, n_samples))
                    kmeans = KMeans(n_clusters=adjusted_clusters, n_init=10, random_state=42)
                    labels = kmeans.fit_predict(X_norm)
                else:
                    # Subsample if dataset is large to maintain interactive responsiveness
                    if n_samples > 1200:
                        np.random.seed(42)
                        subsample_idx = np.random.choice(n_samples, size=1000, replace=False)
                        X_sub = X_norm[subsample_idx]
                    else:
                        X_sub = X_norm
                        subsample_idx = None

                    for k in range(2, max_k + 1):
                        try:
                            km = KMeans(n_clusters=k, n_init=5, random_state=42)
                            lbls = km.fit_predict(X_norm)

                            if subsample_idx is not None:
                                lbls_sub = lbls[subsample_idx]
                                if len(np.unique(lbls_sub)) < 2:
                                    continue
                                score = silhouette_score(X_sub, lbls_sub)
                            else:
                                score = silhouette_score(X_norm, lbls)

                            if score > best_score:
                                best_score = score
                                best_k = k
                        except Exception as e:
                            logger.debug(f"Silhouette evaluation failed for K={k}: {e}")
                            continue

                    logger.info(f"Auto-KMeans selected optimal K={best_k} (Silhouette: {best_score:.4f})")
                    kmeans = KMeans(n_clusters=best_k, n_init=10, random_state=42)
                    labels = kmeans.fit_predict(X_norm)
        else:
            adjusted_clusters = max(1, min(n_clusters, n_samples))
            kmeans = KMeans(
                n_clusters=adjusted_clusters,
                n_init=10,
                random_state=42
            )
            labels = kmeans.fit_predict(X_norm)

    # 2. DBSCAN
    elif method == "dbscan":
        adjusted_min_samples = max(2, min(min_samples, n_samples - 1)) if n_samples > 2 else 1

        if eps <= 0:
            # Auto-estimate optimal cosine epsilon using k-NN distance distribution
            k_nn = max(2, min(adjusted_min_samples + 1, n_samples))
            nbrs = NearestNeighbors(n_neighbors=k_nn, metric="cosine").fit(X_norm)
            distances, _ = nbrs.kneighbors(X_norm)
            k_distances = np.sort(distances[:, -1])
            # Use 75th percentile of k-nearest neighbor distance as heuristic
            computed_eps = float(np.percentile(k_distances, 75))
            computed_eps = max(0.05, min(computed_eps, 0.95))
            logger.info(f"Auto-DBSCAN estimated eps={computed_eps:.4f} with min_samples={adjusted_min_samples}")
            effective_eps = computed_eps
        else:
            effective_eps = eps

        dbscan = DBSCAN(
            eps=effective_eps,
            min_samples=adjusted_min_samples,
            metric="cosine"
        )
        labels = dbscan.fit_predict(X_norm)

    # 3. HDBSCAN
    elif method in ["hdbscan", "hbdscan"]:
        if HDBSCAN is None:
            raise HTTPException(
                status_code=500,
                detail="HDBSCAN is not installed in the environment."
            )

        if min_cluster_size <= 0:
            # Auto-estimate optimal min_cluster_size and min_samples
            if n_samples <= 30:
                candidates = [2, 3, 4, 5]
            elif n_samples <= 150:
                candidates = [3, 4, 5, 7, 10]
            elif n_samples <= 1000:
                candidates = [4, 6, 8, 10, 12, 16, 20]
            else:
                candidates = [8, 12, 16, 24, 32, 48, 64]

            # Filter candidates that are valid for n_samples
            candidates = [c for c in candidates if c <= n_samples]
            if not candidates:
                candidates = [max(2, min(5, n_samples))]

            best_score = -1.0
            best_c = candidates[0]
            best_min_s = max(1, int(best_c * 0.6))
            best_labels = None

            for c in candidates:
                curr_min_s = max(1, int(c * 0.6))
                try:
                    hdb = _create_hdbscan_instance(min_cluster_size=c, min_samples=curr_min_s)
                    lbls = hdb.fit_predict(X_norm)
                    unique_lbls = set(lbls)
                    n_clust = len(unique_lbls) - (1 if -1 in unique_lbls else 0)
                    noise_fraction = float((lbls == -1).sum()) / float(n_samples)

                    if n_clust >= 2 and noise_fraction < 0.65:
                        non_noise = lbls != -1
                        if non_noise.sum() > n_clust:
                            # Subsample for silhouette if large
                            if non_noise.sum() > 800:
                                sub_idx = np.random.choice(np.where(non_noise)[0], size=800, replace=False)
                                sil = silhouette_score(X_norm[sub_idx], lbls[sub_idx])
                            else:
                                sil = silhouette_score(X_norm[non_noise], lbls[non_noise])
                            composite = sil * (1.0 - 0.4 * noise_fraction)
                            if composite > best_score:
                                best_score = composite
                                best_c = c
                                best_min_s = curr_min_s
                                best_labels = lbls
                except Exception as e:
                    logger.debug(f"Auto-HDBSCAN candidate evaluation failed for c={c}: {e}")
                    continue

            if best_labels is not None:
                labels = best_labels
                logger.info(f"Auto-HDBSCAN selected optimal min_cluster_size={best_c}, min_samples={best_min_s} (Score: {best_score:.4f})")
            else:
                fallback_c = max(2, min(5, n_samples))
                fallback_s = max(1, min(fallback_c // 2, n_samples - 1))
                try:
                    hdb = _create_hdbscan_instance(min_cluster_size=fallback_c, min_samples=fallback_s)
                    labels = hdb.fit_predict(X_norm)
                except Exception as e:
                    logger.warning(f"HDBSCAN fallback fit failed: {e}. Defaulting to single cluster.")
                    labels = np.zeros(n_samples, dtype=int)
        else:
            adj_min_cluster_size = max(2, min(min_cluster_size, n_samples))
            adj_min_samples = min_samples if (min_samples and min_samples > 0) else max(2, int(adj_min_cluster_size * 0.6))
            adj_min_samples = max(1, min(adj_min_samples, n_samples - 1))

            logger.info(f"Running HDBSCAN with min_cluster_size={adj_min_cluster_size}, min_samples={adj_min_samples}")
            try:
                hdb = _create_hdbscan_instance(min_cluster_size=adj_min_cluster_size, min_samples=adj_min_samples)
                labels = hdb.fit_predict(X_norm)
            except Exception as e:
                logger.warning(f"HDBSCAN fit failed: {e}. Defaulting to single cluster.")
                labels = np.zeros(n_samples, dtype=int)

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported clustering method '{method}'. Supported methods are 'kmeans', 'dbscan', and 'hdbscan'."
        )

    # Return mapping of vector ID to cluster label (ensure type is int)
    return {vector_ids[i]: int(labels[i]) for i in range(n_samples)}

