import numpy as np
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple
from fastapi import HTTPException

def run_clustering(
    embeddings: List[List[float]],
    vector_ids: List[str],
    method: str = "kmeans",
    n_clusters: int = 5,
    eps: float = 0.5,
    min_samples: int = 5
) -> Dict[str, int]:
    """
    Runs clustering on the provided embeddings.
    Returns a dictionary mapping vector ID to cluster label integer.
    """
    X = np.array(embeddings, dtype=np.float32)
    n_samples = X.shape[0]

    if n_samples == 0:
        return {}

    # Always scale prior to clustering
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    method = method.lower()
    if method == "kmeans":
        if n_clusters <= 0:
            # Adaptive Clustering using Silhouette Coefficient
            if n_samples < 3:
                adjusted_clusters = max(1, min(5, n_samples))
                kmeans = KMeans(n_clusters=adjusted_clusters, n_init=10, random_state=42)
                labels = kmeans.fit_predict(X_scaled)
            else:
                from sklearn.metrics import silhouette_score
                best_k = 2
                best_score = -1.0
                max_k = min(10, n_samples - 1)
                
                # Subsample if dataset is too large
                if n_samples > 1000:
                    np.random.seed(42)
                    subsample_idx = np.random.choice(n_samples, size=1000, replace=False)
                    X_sub = X_scaled[subsample_idx]
                else:
                    X_sub = X_scaled
                    subsample_idx = None
                
                for k in range(2, max_k + 1):
                    try:
                        km = KMeans(n_clusters=k, n_init=5, random_state=42)
                        lbls = km.fit_predict(X_scaled)
                        
                        if subsample_idx is not None:
                            lbls_sub = lbls[subsample_idx]
                            if len(np.unique(lbls_sub)) < 2:
                                continue
                            score = silhouette_score(X_sub, lbls_sub)
                        else:
                            score = silhouette_score(X_scaled, lbls)
                            
                        if score > best_score:
                            best_score = score
                            best_k = k
                    except Exception:
                        continue
                
                kmeans = KMeans(n_clusters=best_k, n_init=10, random_state=42)
                labels = kmeans.fit_predict(X_scaled)
        else:
            # Cannot have more clusters than samples
            adjusted_clusters = min(n_clusters, n_samples)
            kmeans = KMeans(
                n_clusters=adjusted_clusters,
                n_init=10,
                random_state=42
            )
            labels = kmeans.fit_predict(X_scaled)
        
    elif method == "dbscan":
        dbscan = DBSCAN(
            eps=eps,
            min_samples=min_samples
        )
        labels = dbscan.fit_predict(X_scaled)
        
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported clustering method '{method}'."
        )

    # Return mapping of vector ID to cluster label (ensure type is int)
    return {vector_ids[i]: int(labels[i]) for i in range(n_samples)}
