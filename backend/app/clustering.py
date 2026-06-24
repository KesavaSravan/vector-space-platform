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
