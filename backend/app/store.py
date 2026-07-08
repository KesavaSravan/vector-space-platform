import threading
import logging
from typing import List, Dict, Any, Optional
from app.models import VectorInput

# Configure logging
logger = logging.getLogger("store")

# Gracefully import FAISS and NumPy
try:
    import faiss
    import numpy as np
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logger.warning("FAISS: 'faiss-cpu' library not found. Will use NumPy vectorized search as fallback.")

class VectorStore:
    def __init__(self):
        self.lock = threading.Lock()
        self.vectors: Dict[str, Dict[str, Any]] = {}
        self.coords: Dict[str, List[float]] = {}
        self.dimension: Optional[int] = None
        self.faiss_index = None
        self.vector_id_list: List[str] = []
        self.embedding_provider: Optional[str] = None
        self.embedding_model: Optional[str] = None
        self.embedding_api_key: Optional[str] = None

    def set_embedding_metadata(self, provider: str, model: str, api_key: Optional[str] = None):
        with self.lock:
            self.embedding_provider = provider
            self.embedding_model = model
            self.embedding_api_key = api_key
            logger.info(f"VectorStore: Set embedding metadata to Provider={provider}, Model={model}, KeyConfigured={api_key is not None}")

    def _rebuild_faiss_index(self):
        """
        Rebuilds the FAISS index from the currently stored vectors.
        Uses Cosine Similarity (inner product on normalized vectors).
        """
        if not FAISS_AVAILABLE:
            self.faiss_index = None
            self.vector_id_list = []
            return

        try:
            n_samples = len(self.vectors)
            if n_samples == 0 or self.dimension is None:
                self.faiss_index = None
                self.vector_id_list = []
                return

            self.vector_id_list = list(self.vectors.keys())
            embeddings = np.array([self.vectors[vid]["embedding"] for vid in self.vector_id_list], dtype=np.float32)

            # Normalize embeddings for Cosine (inner product) search
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            embeddings_norm = embeddings / norms

            # IndexFlatIP is inner product index, which is Cosine Similarity on normalized vectors
            self.faiss_index = faiss.IndexFlatIP(self.dimension)
            self.faiss_index.add(embeddings_norm)
            logger.info(f"FAISS: Index successfully built with {n_samples} vectors of dimension {self.dimension}.")
        except Exception as e:
            logger.error(f"FAISS: Failed to build persistent index: {str(e)}")
            self.faiss_index = None
            self.vector_id_list = []

    def add_vectors(self, new_vectors: List[VectorInput]) -> Dict[str, int]:
        with self.lock:
            accepted = 0
            rejected = 0
            
            for v in new_vectors:
                emb_len = len(v.embedding)
                if emb_len == 0:
                    rejected += 1
                    continue

                if self.dimension is None:
                    self.dimension = emb_len
                elif emb_len != self.dimension:
                    rejected += 1
                    continue

                # Ensure severity exists in metadata, default to "Low" if missing
                metadata = dict(v.metadata)
                severity = metadata.get("severity", "Low")
                if severity not in ["Critical", "High", "Medium", "Low"]:
                    severity = "Low"
                metadata["severity"] = severity

                self.vectors[v.id] = {
                    "id": v.id,
                    "label": v.label,
                    "embedding": v.embedding,
                    "cluster": self.vectors.get(v.id, {}).get("cluster", 0), # Preserve cluster if already exists
                    "metadata": metadata
                }
                accepted += 1

            if accepted > 0:
                self._rebuild_faiss_index()
                
                # Automatically run KMeans clustering on ingestion
                try:
                    n_samples = len(self.vectors)
                    if n_samples > 0:
                        from app.clustering import run_clustering
                        vids = list(self.vectors.keys())
                        embs = [self.vectors[vid]["embedding"] for vid in vids]
                        n_clusters = min(5, n_samples)
                        cluster_mappings = run_clustering(
                            embeddings=embs,
                            vector_ids=vids,
                            method="kmeans",
                            n_clusters=n_clusters
                        )
                        for vid, cluster_id in cluster_mappings.items():
                            if vid in self.vectors:
                                self.vectors[vid]["cluster"] = cluster_id
                        logger.info(f"VectorStore: Automatically computed {n_clusters} clusters with KMeans.")
                except Exception as e:
                    logger.warning(f"VectorStore: Auto-clustering failed: {str(e)}")

            return {
                "accepted": accepted,
                "rejected": rejected,
                "dimension": self.dimension if self.dimension is not None else 0,
                "total_vectors": len(self.vectors)
            }

    def clear(self):
        with self.lock:
            self.vectors.clear()
            self.coords.clear()
            self.dimension = None
            self.faiss_index = None
            self.vector_id_list.clear()
            self.embedding_provider = None
            self.embedding_model = None
            self.embedding_api_key = None

    def get_all_vectors(self) -> List[Dict[str, Any]]:
        with self.lock:
            return list(self.vectors.values())

    def get_vector(self, vector_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.vectors.get(vector_id)

    def update_clusters(self, cluster_mappings: Dict[str, int]):
        with self.lock:
            for vid, cluster_id in cluster_mappings.items():
                if vid in self.vectors:
                    self.vectors[vid]["cluster"] = cluster_id

    def update_coords(self, coords_mappings: Dict[str, List[float]]):
        with self.lock:
            self.coords = coords_mappings.copy()

    def get_coords(self) -> Dict[str, List[float]]:
        with self.lock:
            return self.coords.copy()

    def get_dimension(self) -> Optional[int]:
        with self.lock:
            return self.dimension

    def has_vectors(self) -> bool:
        with self.lock:
            return len(self.vectors) > 0

    def get_total_count(self) -> int:
        with self.lock:
            return len(self.vectors)

    def query_similarity(self, query_vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Queries the stored vectors using the cached FAISS index.
        If FAISS is not available or fails, falls back to NumPy vectorized search.
        """
        if not self.has_vectors():
            return []

        # Check if FAISS index is active and dimension matches
        if FAISS_AVAILABLE and self.faiss_index is not None:
            try:
                q_vec = np.array(query_vector, dtype=np.float32)
                if len(q_vec) != self.dimension:
                    # Dimension mismatch, let caller handle it or skip FAISS
                    return []
                    
                # Normalize query vector for Cosine Similarity
                q_norm = np.linalg.norm(q_vec)
                if q_norm == 0:
                    q_norm = 1e-10
                q_val = (q_vec / q_norm).reshape(1, -1)

                scores, indices = self.faiss_index.search(q_val, top_k)
                
                results = []
                for score, idx in zip(scores[0], indices[0]):
                    if idx == -1 or idx >= len(self.vector_id_list):
                        continue
                    vid = self.vector_id_list[idx]
                    vec_info = self.vectors.get(vid)
                    if vec_info:
                        results.append({
                            "id": vid,
                            "label": vec_info["label"],
                            "score": float(score),
                            "metadata": vec_info["metadata"]
                        })
                return results
            except Exception as e:
                logger.warning(f"FAISS search failed: {str(e)}. Falling back to NumPy search.")

        # NumPy Fallback
        from app.similarity import find_similar_vectors
        return find_similar_vectors(query_vector, self.get_all_vectors(), top_k=top_k, metric="cosine")

# Global store instance
store = VectorStore()

