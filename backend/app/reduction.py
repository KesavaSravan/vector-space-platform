import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from typing import List, Dict, Tuple, Any
from fastapi import HTTPException

# Graceful check for UMAP
try:
    import umap
    UMAP_AVAILABLE = True
except ImportError:
    UMAP_AVAILABLE = False

def reduce_dimensions(
    embeddings: List[List[float]],
    method: str = "pca",
    n_components: int = 3,
    perplexity: float = 30.0,
    n_neighbors: int = 15,
    min_dist: float = 0.1,
    scaler_model = None,
    reducer_model = None
) -> Tuple[np.ndarray, Any, Any]:
    """
    Standard scales and reduces embeddings to 2D or 3D.
    Adjusts hyper-parameters gracefully if they exceed sample size.
    Returns (reduced_coordinates, scaler_model, reducer_model).
    """
    X = np.array(embeddings, dtype=np.float32)
    n_samples = X.shape[0]
    method = method.lower()

    # 1. Use pre-fit models if available and compatible
    if scaler_model is not None and reducer_model is not None and method in ["pca", "umap"]:
        try:
            X_scaled = scaler_model.transform(X)
            if hasattr(reducer_model, "transform"):
                reduced = reducer_model.transform(X_scaled)
                return reduced, scaler_model, reducer_model
        except Exception:
            # If transform fails, fall back to fitting a new model below
            pass

    if n_samples < n_components:
        raise HTTPException(
            status_code=400,
            detail=f"Number of samples ({n_samples}) must be at least as large as n_components ({n_components})."
        )

    # 2. StandardScale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 3. Reduction methods
    if method == "pca":
        pca = PCA(n_components=n_components, random_state=42)
        reduced = pca.fit_transform(X_scaled)
        return reduced, scaler, pca

    elif method == "tsne":
        adjusted_perplexity = perplexity
        if adjusted_perplexity >= n_samples:
            adjusted_perplexity = max(1.0, float(n_samples - 1))
        
        import inspect
        tsne_params = {
            "n_components": n_components,
            "perplexity": adjusted_perplexity,
            "random_state": 42
        }
        sig = inspect.signature(TSNE.__init__)
        if "max_iter" in sig.parameters:
            tsne_params["max_iter"] = 1000
        else:
            tsne_params["n_iter"] = 1000

        tsne = TSNE(**tsne_params)
        reduced = tsne.fit_transform(X_scaled)
        return reduced, scaler, tsne

    elif method == "umap":
        if not UMAP_AVAILABLE:
            raise HTTPException(
                status_code=400,
                detail="UMAP-learn package is not installed on the backend. Please use PCA or t-SNE."
            )
        
        adjusted_n_neighbors = n_neighbors
        if adjusted_n_neighbors >= n_samples:
            adjusted_n_neighbors = max(2, n_samples - 1)

        reducer = umap.UMAP(
            n_components=n_components,
            n_neighbors=adjusted_n_neighbors,
            min_dist=min_dist,
            random_state=42
        )
        reduced = reducer.fit_transform(X_scaled)
        return reduced, scaler, reducer

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported dimensionality reduction method '{method}'.")

def calculate_visualization_quality(
    original_embeddings: List[List[float]],
    reduced_coords: np.ndarray,
    method: str,
    reducer_model: Any
) -> Dict[str, Any]:
    """
    Dynamically evaluates the 3D visualization quality for the reduction method.
    Metrics: Explained Variance, Neighbour Preservation, Distance Correlation, Trustworthiness.
    Returns a dict with all quality metrics, overall quality score, and label.
    """
    X_orig = np.array(original_embeddings, dtype=np.float32)
    X_reduced = np.array(reduced_coords, dtype=np.float32)
    n_samples = X_orig.shape[0]
    method_lower = method.lower()

    # 1. Explained Variance (PCA only)
    explained_variance = None
    if method_lower == "pca" and reducer_model is not None:
        if hasattr(reducer_model, "explained_variance_ratio_"):
            explained_variance = float(np.sum(reducer_model.explained_variance_ratio_) * 100)
            explained_variance = round(explained_variance, 2)

    # 2. Neighbour Preservation
    neighbor_preservation = 0.0
    if n_samples > 1:
        K = min(10, n_samples - 1)
        from sklearn.neighbors import NearestNeighbors
        
        nn_orig = NearestNeighbors(n_neighbors=K + 1, metric='euclidean')
        nn_orig.fit(X_orig)
        _, indices_orig = nn_orig.kneighbors(X_orig)

        nn_3d = NearestNeighbors(n_neighbors=K + 1, metric='euclidean')
        nn_3d.fit(X_reduced)
        _, indices_3d = nn_3d.kneighbors(X_reduced)

        overlap_sum = 0.0
        for i in range(n_samples):
            # Exclude the vector itself
            set_orig = set(idx for idx in indices_orig[i] if idx != i)
            set_3d = set(idx for idx in indices_3d[i] if idx != i)
            intersection = set_orig.intersection(set_3d)
            if K > 0:
                overlap_sum += len(intersection) / K
            else:
                overlap_sum += 1.0
        neighbor_preservation = round((overlap_sum / n_samples) * 100, 2)
    else:
        neighbor_preservation = 100.0

    # 3. Distance Correlation & 4. Trustworthiness
    # Sample if dataset is large for distance correlation and trustworthiness
    # Reproducible sampling using fixed seed 42
    MAX_SAMPLES = 2000
    if n_samples > MAX_SAMPLES:
        rng = np.random.default_rng(seed=42)
        sample_indices = rng.choice(n_samples, size=MAX_SAMPLES, replace=False)
        X_orig_sample = X_orig[sample_indices]
        X_reduced_sample = X_reduced[sample_indices]
    else:
        X_orig_sample = X_orig
        X_reduced_sample = X_reduced

    n_samples_sample = X_orig_sample.shape[0]

    # Distance Correlation
    distance_correlation = 0.0
    if n_samples_sample > 1:
        from sklearn.metrics import pairwise_distances
        from scipy.stats import spearmanr
        
        dist_orig = pairwise_distances(X_orig_sample, metric='euclidean')
        dist_3d = pairwise_distances(X_reduced_sample, metric='euclidean')
        
        triu_indices = np.triu_indices(n_samples_sample, k=1)
        flat_orig = dist_orig[triu_indices]
        flat_3d = dist_3d[triu_indices]
        
        # Check for constant distances
        if np.allclose(flat_orig, flat_orig[0]) or np.allclose(flat_3d, flat_3d[0]):
            distance_correlation = 0.0
        else:
            coef, _ = spearmanr(flat_orig, flat_3d)
            if np.isnan(coef):
                distance_correlation = 0.0
            else:
                distance_correlation = round(float(coef), 2)
    else:
        distance_correlation = 1.0

    # Trustworthiness
    trustworthiness_val = 1.0
    if n_samples_sample > 2:
        from sklearn.manifold import trustworthiness
        # trustworthiness parameter validation requires n_neighbors < n_samples / 2
        n_neighbors_t = max(1, min(5, int((n_samples_sample - 1) / 2)))
        try:
            score = trustworthiness(X_orig_sample, X_reduced_sample, n_neighbors=n_neighbors_t, metric='euclidean')
            trustworthiness_val = round(float(score), 3)
        except Exception:
            trustworthiness_val = 1.0
    else:
        trustworthiness_val = 1.0

    # Overall Visualization Quality Score
    norm_ev = explained_variance if explained_variance is not None else 0.0
    norm_np = neighbor_preservation
    norm_dc = max(0.0, distance_correlation) * 100
    norm_tw = trustworthiness_val * 100

    if method_lower == "pca" and explained_variance is not None:
        # PCA weights: EV 20%, NP 30%, DC 20%, TW 30%
        quality_score = (norm_ev * 0.20) + (norm_np * 0.30) + (norm_dc * 0.20) + (norm_tw * 0.30)
    else:
        # t-SNE & UMAP weights: NP 35%, DC 20%, TW 45%
        quality_score = (norm_np * 0.35) + (norm_dc * 0.20) + (norm_tw * 0.45)

    quality_score = round(quality_score, 1)

    # Classify overall quality
    if quality_score >= 85.0:
        quality_label = "EXCELLENT"
    elif quality_score >= 70.0:
        quality_label = "GOOD"
    elif quality_score >= 50.0:
        quality_label = "FAIR"
    else:
        quality_label = "POOR"

    return {
        "method": method_lower,
        "explained_variance": explained_variance,
        "neighbor_preservation": neighbor_preservation,
        "distance_correlation": distance_correlation,
        "trustworthiness": trustworthiness_val,
        "quality_score": quality_score,
        "quality": quality_label
    }

