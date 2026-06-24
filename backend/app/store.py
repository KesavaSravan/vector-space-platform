import threading
from typing import List, Dict, Any, Optional
from app.models import VectorInput

class VectorStore:
    def __init__(self):
        self.lock = threading.Lock()
        self.vectors: Dict[str, Dict[str, Any]] = {}
        self.coords: Dict[str, List[float]] = {}
        self.dimension: Optional[int] = None

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

# Global store instance
store = VectorStore()
