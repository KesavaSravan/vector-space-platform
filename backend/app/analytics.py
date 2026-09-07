import numpy as np
from typing import List, Dict, Any

def calculate_statistics(vectors: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes analytics and aggregations over the loaded vectors.
    """
    total_vectors = len(vectors)
    if total_vectors == 0:
        return {
            "total_vectors": 0,
            "clusters_count": 0,
            "average_similarity": 0.0,
            "outliers_count": 0,
            "cluster_distribution": {},
            "severity_distribution": {}
        }

    # Extract info
    clusters = [v["cluster"] for v in vectors]
    severities = [v["metadata"].get("severity", "Low") for v in vectors]
    embeddings = np.array([v["embedding"] for v in vectors], dtype=np.float32)

    # 1. Total clusters found (excluding outlier -1)
    unique_clusters = set(clusters)
    if -1 in unique_clusters:
        clusters_count = len(unique_clusters) - 1
        outliers_count = clusters.count(-1)
    else:
        clusters_count = len(unique_clusters)
        outliers_count = 0

    # 2. Cluster distribution
    cluster_distribution = {}
    for c in unique_clusters:
        cluster_distribution[str(c)] = clusters.count(c)

    # 3. Severity distribution
    severity_distribution = {
        "Critical": severities.count("Critical"),
        "High": severities.count("High"),
        "Medium": severities.count("Medium"),
        "Low": severities.count("Low")
    }

    # 4. Average similarity to center centroid
    # Let's compute average cosine similarity of all vectors to the global mean vector
    try:
        global_mean = np.mean(embeddings, axis=0)
        mean_norm = np.linalg.norm(global_mean)
        if mean_norm == 0:
            mean_norm = 1e-10
        global_mean_normalized = global_mean / mean_norm

        emb_norms = np.linalg.norm(embeddings, axis=1)
        emb_norms[emb_norms == 0] = 1e-10
        emb_normalized = embeddings / emb_norms[:, np.newaxis]

        similarities = np.dot(emb_normalized, global_mean_normalized)
        # Map range [-1, 1] to [0, 100] percent
        avg_sim = float(np.mean(similarities))
        avg_sim_pct = round(((avg_sim + 1.0) / 2.0) * 100.0, 2)
    except Exception:
        avg_sim_pct = 0.0

    return {
        "total_vectors": total_vectors,
        "clusters_count": clusters_count,
        "average_similarity": avg_sim_pct,
        "outliers_count": outliers_count,
        "cluster_distribution": cluster_distribution,
        "severity_distribution": severity_distribution
    }
