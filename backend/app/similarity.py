import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from fastapi import HTTPException

# Gracefully import FAISS
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

def compute_similarity_numpy(
    query_vector: np.ndarray,
    embeddings: np.ndarray,
    vector_ids: List[str],
    top_k: int = 10,
    metric: str = "cosine"
) -> List[Tuple[str, float]]:
    """
    Computes similarity using pure NumPy (vectorized).
    """
    metric = metric.lower()
    
    if metric == "cosine":
        # Normalize query vector
        query_norm = np.linalg.norm(query_vector)
        if query_norm == 0:
            query_norm = 1e-10
        q_normalized = query_vector / query_norm

        # Normalize database embeddings
        emb_norms = np.linalg.norm(embeddings, axis=1)
        emb_norms[emb_norms == 0] = 1e-10
        emb_normalized = embeddings / emb_norms[:, np.newaxis]

        # Dot product
        scores = np.dot(emb_normalized, q_normalized)
        
        # Sort desc
        indices = np.argsort(scores)[::-1]
        
        results = []
        for idx in indices[:top_k]:
            results.append((vector_ids[idx], float(scores[idx])))
        return results

    elif metric == "euclidean":
        # Euclidean distance
        dists = np.linalg.norm(embeddings - query_vector, axis=1)
        
        # Sort asc
        indices = np.argsort(dists)
        
        results = []
        for idx in indices[:top_k]:
            # Convert distance to a similarity score between 0 and 1
            # Using 1 / (1 + dist)
            score = 1.0 / (1.0 + float(dists[idx]))
            results.append((vector_ids[idx], score))
        return results

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported similarity metric '{metric}'.")

def compute_similarity_faiss(
    query_vector: np.ndarray,
    embeddings: np.ndarray,
    vector_ids: List[str],
    top_k: int = 10,
    metric: str = "cosine"
) -> List[Tuple[str, float]]:
    """
    Computes similarity using FAISS IndexFlatIP (Cosine) or IndexFlatL2 (Euclidean).
    """
    metric = metric.lower()
    dim = embeddings.shape[1]
    
    # Reshape query to (1, dim) and cast to float32
    q = query_vector.astype(np.float32).reshape(1, -1)
    db = embeddings.astype(np.float32)

    if metric == "cosine":
        # Cosine is inner product on L2-normalized vectors
        q_norm = np.linalg.norm(q, axis=1, keepdims=True)
        q_norm[q_norm == 0] = 1e-10
        q = q / q_norm

        db_norms = np.linalg.norm(db, axis=1, keepdims=True)
        db_norms[db_norms == 0] = 1e-10
        db = db / db_norms

        index = faiss.IndexFlatIP(dim)
        index.add(db)
        scores, indices = index.search(q, top_k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            results.append((vector_ids[idx], float(score)))
        return results

    elif metric == "euclidean":
        index = faiss.IndexFlatL2(dim)
        index.add(db)
        dists, indices = index.search(q, top_k)
        
        results = []
        for dist, idx in zip(dists[0], indices[0]):
            if idx == -1:
                continue
            score = 1.0 / (1.0 + float(dist))
            results.append((vector_ids[idx], score))
        return results

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported similarity metric '{metric}'.")

def find_similar_vectors(
    query_embedding: List[float],
    all_vectors: List[Dict[str, Any]],
    top_k: int = 10,
    metric: str = "cosine"
) -> List[Dict[str, Any]]:
    """
    Determines similar vectors. Chooses FAISS if dataset size >= 5000 and FAISS is available.
    Otherwise uses NumPy.
    """
    if not all_vectors:
        return []

    # Filter out query itself if it's identical by checking IDs later or during mapping
    # Prepare matrices
    embeddings = np.array([v["embedding"] for v in all_vectors], dtype=np.float32)
    vector_ids = [v["id"] for v in all_vectors]
    q_vec = np.array(query_embedding, dtype=np.float32)

    n_samples = len(all_vectors)

    # Use FAISS if available and dataset size >= 5000
    if FAISS_AVAILABLE and n_samples >= 5000:
        try:
            scores_with_ids = compute_similarity_faiss(q_vec, embeddings, vector_ids, top_k, metric)
        except Exception:
            scores_with_ids = compute_similarity_numpy(q_vec, embeddings, vector_ids, top_k, metric)
    else:
        scores_with_ids = compute_similarity_numpy(q_vec, embeddings, vector_ids, top_k, metric)

    # Re-map results back to metadata
    id_to_vector = {v["id"]: v for v in all_vectors}
    
    results = []
    for vid, score in scores_with_ids:
        vec_info = id_to_vector.get(vid)
        if vec_info:
            results.append({
                "id": vid,
                "label": vec_info["label"],
                "score": score,
                "metadata": vec_info["metadata"]
            })
            
    return results
