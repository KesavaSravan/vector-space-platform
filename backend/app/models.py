from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class VectorInput(BaseModel):
    id: str
    label: str
    embedding: List[float]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class UploadVectorsJSONRequest(BaseModel):
    vectors: List[VectorInput]

class ReductionRequest(BaseModel):
    method: str = "pca"  # "pca", "tsne", "umap"
    n_components: int = 3
    perplexity: float = 30.0
    n_neighbors: int = 15
    min_dist: float = 0.1

class ClusteringRequest(BaseModel):
    method: str = "kmeans"  # "kmeans", "dbscan"
    n_clusters: int = 5
    eps: float = 0.5
    min_samples: int = 5

class SimilarityRequest(BaseModel):
    vector_id: Optional[str] = None
    embedding: Optional[List[float]] = None
    top_k: int = 10
    metric: str = "cosine"  # "cosine", "euclidean"

class GenerateEmbeddingsRequest(BaseModel):
    provider: str  # "sentence-transformers", "openai", "azure", "gemini"
    documents: List[str]
    model: Optional[str] = None
    api_key: Optional[str] = None
    azure_endpoint: Optional[str] = None
    azure_deployment: Optional[str] = None
    batch_size: Optional[int] = 100

class GenerateEmbeddingsTextRequest(BaseModel):
    provider: str  # "sentence-transformers", "openai", "azure", "gemini"
    text_data: str
    model: Optional[str] = None
    api_key: Optional[str] = None
    azure_endpoint: Optional[str] = None
    azure_deployment: Optional[str] = None
    batch_size: Optional[int] = 100

class PointResponse(BaseModel):
    id: str
    label: str
    coords: List[float]
    cluster: int
    severity: str
    metadata: Dict[str, Any]

class SimilarityMatch(BaseModel):
    id: str
    label: str
    score: float
    metadata: Dict[str, Any]

class SimilarityResponse(BaseModel):
    queryId: Optional[str] = None
    matches: List[SimilarityMatch]

class ClusterItem(BaseModel):
    id: str
    cluster: int

class ClusterResponse(BaseModel):
    clusters: List[ClusterItem]

class StatisticsResponse(BaseModel):
    total_vectors: int
    clusters_count: int
    average_similarity: float
    outliers_count: int
    cluster_distribution: Dict[str, int]
    severity_distribution: Dict[str, int]
    embedding_provider: Optional[str] = None
    embedding_model: Optional[str] = None

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    chat_history: List[ChatMessage] = []
    provider: str = "gemini"  # "gemini" or "groq"
    model: Optional[str] = None
    api_key: Optional[str] = None
    embedding_api_key: Optional[str] = None
    use_rag: bool = False
    top_k: int = 5

class ChatResponse(BaseModel):
    answer: str
    context_nodes: List[Dict[str, Any]] = []

