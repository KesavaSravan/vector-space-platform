import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from typing import List, Dict, Tuple
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
    min_dist: float = 0.1
) -> np.ndarray:
    """
    Standard scales and reduces embeddings to 2D or 3D.
    Adjusts hyper-parameters gracefully if they exceed sample size.
    """
    X = np.array(embeddings, dtype=np.float32)
    n_samples = X.shape[0]

    if n_samples < n_components:
        raise HTTPException(
            status_code=400,
            detail=f"Number of samples ({n_samples}) must be at least as large as n_components ({n_components})."
        )

    # 1. StandardScaler before reduction
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 2. Reduction methods
    method = method.lower()
    if method == "pca":
        pca = PCA(n_components=n_components, random_state=42)
        reduced = pca.fit_transform(X_scaled)
        return reduced

    elif method == "tsne":
        # Perplexity must be less than n_samples
        adjusted_perplexity = perplexity
        if adjusted_perplexity >= n_samples:
            adjusted_perplexity = max(1.0, float(n_samples - 1))
        
        import inspect
        tsne_params = {
            "n_components": n_components,
            "perplexity": adjusted_perplexity,
            "random_state": 42
        }
        # In scikit-learn >= 1.5, n_iter was renamed to max_iter
        sig = inspect.signature(TSNE.__init__)
        if "max_iter" in sig.parameters:
            tsne_params["max_iter"] = 1000
        else:
            tsne_params["n_iter"] = 1000

        tsne = TSNE(**tsne_params)
        reduced = tsne.fit_transform(X_scaled)
        return reduced

    elif method == "umap":
        if not UMAP_AVAILABLE:
            raise HTTPException(
                status_code=400,
                detail="UMAP-learn package is not installed on the backend. Please use PCA or t-SNE."
            )
        
        # n_neighbors must be less than n_samples
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
        return reduced

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported dimensionality reduction method '{method}'.")
