import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional

from app.models import (
    UploadVectorsJSONRequest,
    ReductionRequest,
    ClusteringRequest,
    SimilarityRequest,
    GenerateEmbeddingsRequest,
    PointResponse,
    SimilarityResponse,
    SimilarityMatch,
    ClusterResponse,
    ClusterItem,
    StatisticsResponse,
    VectorInput
)
from app.store import store
from app.ingest import parse_json_data, parse_csv_data
from app.reduction import reduce_dimensions
from app.clustering import run_clustering
from app.similarity import find_similar_vectors
from app.embeddings import generate_embeddings
from app.analytics import calculate_statistics

app = FastAPI(
    title="AI Vector Space Visualization Platform API",
    description="Backend API for vector uploads, clustering, dimensionality reduction, similarity search, and analytics",
    version="1.0.0"
)

# Enable CORS for all origins (demo mode)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Simple API health check."""
    return {"status": "ok", "message": "API is healthy"}

@app.post("/upload-vectors")
async def upload_vectors_file(file: UploadFile = File(...)):
    """
    Accepts .csv or .json files via multipart file upload.
    Parses, validates, and stores vectors.
    """
    filename = file.filename or ""
    content = await file.read()
    
    try:
        if filename.endswith(".json"):
            vectors = parse_json_data(content)
        elif filename.endswith(".csv"):
            vectors = parse_csv_data(content)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload a .csv or .json file."
            )
        
        summary = store.add_vectors(vectors)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the file upload: {str(e)}"
        )

@app.post("/upload-vectors-json")
def upload_vectors_json(request: UploadVectorsJSONRequest):
    """
    Exposed JSON endpoint for programmatic vector ingestion.
    """
    try:
        summary = store.add_vectors(request.vectors)
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load JSON vectors: {str(e)}"
        )

@app.delete("/vectors")
def delete_all_vectors():
    """
    Clears the VectorStore and active coordinates.
    """
    store.clear()
    return {"status": "success", "message": "All vectors cleared from store."}

@app.get("/vectors")
def get_vectors_paginated(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    cluster: Optional[int] = None
):
    """
    Returns a paginated list of all ingested vectors.
    Supports filtering by search query (id or label) and cluster.
    """
    all_vectors = store.get_all_vectors()
    
    # Filter
    filtered = []
    for v in all_vectors:
        match_search = True
        match_cluster = True
        
        if search:
            search_lower = search.lower()
            match_search = (search_lower in v["id"].lower()) or (search_lower in v["label"].lower())
            
        if cluster is not None:
            match_cluster = (v["cluster"] == cluster)
            
        if match_search and match_cluster:
            # Strip embedding from paginated list to reduce bandwidth
            filtered.append({
                "id": v["id"],
                "label": v["label"],
                "cluster": v["cluster"],
                "severity": v["metadata"].get("severity", "Low"),
                "metadata": v["metadata"]
            })
            
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "results": filtered[start:end]
    }

@app.get("/vector/{vector_id}")
def get_vector_details(vector_id: str):
    """
    Returns detailed vector info including its embedding.
    """
    vector = store.get_vector(vector_id)
    if not vector:
        raise HTTPException(
            status_code=404,
            detail=f"Vector with ID '{vector_id}' not found."
        )
    return vector

@app.post("/reduce-dimensions", response_model=List[PointResponse])
def reduce_vectors_dimensions(request: ReductionRequest):
    """
    Applies StandardScaling + Dimensionality reduction (PCA/t-SNE/UMAP).
    Stores and returns coordinates mapped to each vector.
    """
    if not store.has_vectors():
        raise HTTPException(
            status_code=400,
            detail="No vectors are loaded in the system. Upload vectors first."
        )
        
    all_vectors = store.get_all_vectors()
    embeddings = [v["embedding"] for v in all_vectors]
    
    try:
        reduced_coords = reduce_dimensions(
            embeddings=embeddings,
            method=request.method,
            n_components=request.n_components,
            perplexity=request.perplexity,
            n_neighbors=request.n_neighbors,
            min_dist=request.min_dist
        )
        
        # Save to store and map coordinates
        coords_mapping = {}
        response_data = []
        
        for idx, v in enumerate(all_vectors):
            coords = [float(x) for x in reduced_coords[idx]]
            coords_mapping[v["id"]] = coords
            
            response_data.append(PointResponse(
                id=v["id"],
                label=v["label"],
                coords=coords,
                cluster=v["cluster"],
                severity=v["metadata"].get("severity", "Low"),
                metadata=v["metadata"]
            ))
            
        store.update_coords(coords_mapping)
        return response_data
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Dimension reduction failed: {str(e)}"
        )

@app.post("/cluster", response_model=ClusterResponse)
def cluster_vectors(request: ClusteringRequest):
    """
    Performs clustering (KMeans/DBSCAN) on ingested embeddings.
    Saves new labels into store and returns mapping.
    """
    if not store.has_vectors():
        raise HTTPException(
            status_code=400,
            detail="No vectors are loaded in the system."
        )
        
    all_vectors = store.get_all_vectors()
    embeddings = [v["embedding"] for v in all_vectors]
    vector_ids = [v["id"] for v in all_vectors]
    
    try:
        cluster_mappings = run_clustering(
            embeddings=embeddings,
            vector_ids=vector_ids,
            method=request.method,
            n_clusters=request.n_clusters,
            eps=request.eps,
            min_samples=request.min_samples
        )
        
        store.update_clusters(cluster_mappings)
        
        items = [ClusterItem(id=vid, cluster=c) for vid, c in cluster_mappings.items()]
        return ClusterResponse(clusters=items)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Clustering algorithm failed: {str(e)}"
        )

@app.post("/similarity", response_model=SimilarityResponse)
def search_similarity(request: SimilarityRequest):
    """
    Searches for top_k similar vectors given a vector_id or raw embedding.
    """
    if not store.has_vectors():
        raise HTTPException(
            status_code=400,
            detail="No vectors are loaded in the system."
        )

    all_vectors = store.get_all_vectors()
    
    query_emb = None
    query_id = None
    
    # 1. Retrieve query embedding
    if request.vector_id:
        v = store.get_vector(request.vector_id)
        if not v:
            raise HTTPException(
                status_code=404,
                detail=f"Query vector ID '{request.vector_id}' not found."
            )
        query_emb = v["embedding"]
        query_id = request.vector_id
    elif request.embedding:
        if len(request.embedding) != store.get_dimension():
            raise HTTPException(
                status_code=400,
                detail=f"Query embedding dimension ({len(request.embedding)}) must match database dimension ({store.get_dimension()})."
            )
        query_emb = request.embedding
    else:
        raise HTTPException(
            status_code=400,
            detail="Must provide either 'vector_id' or 'embedding' in request body."
        )

    try:
        similarities = find_similar_vectors(
            query_embedding=query_emb,
            all_vectors=all_vectors,
            top_k=request.top_k,
            metric=request.metric
        )
        
        matches = []
        for s in similarities:
            # Exclude the query vector itself from neighbors
            if query_id and s["id"] == query_id:
                continue
            matches.append(SimilarityMatch(
                id=s["id"],
                label=s["label"],
                score=s["score"],
                metadata=s["metadata"]
            ))
            
        return SimilarityResponse(
            queryId=query_id,
            # Slice down to top_k in case query exclusion left space or returned more
            matches=matches[:request.top_k]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Similarity search failed: {str(e)}"
        )

@app.get("/statistics", response_model=StatisticsResponse)
def get_store_statistics():
    """
    Returns data analytics (outliers, clusters, and distributions).
    """
    all_vectors = store.get_all_vectors()
    stats = calculate_statistics(all_vectors)
    return stats

@app.post("/generate-embeddings")
def generate_ai_embeddings(request: GenerateEmbeddingsRequest):
    """
    Generates embeddings from documents using the specified provider,
    adds them to store, and returns upload summary metadata.
    """
    try:
        embeddings = generate_embeddings(
            provider=request.provider,
            documents=request.documents,
            model=request.model,
            api_key=request.api_key,
            azure_endpoint=request.azure_endpoint,
            azure_deployment=request.azure_deployment
        )
        
        # Ingest as new VectorInputs
        new_vectors = []
        for idx, doc in enumerate(request.documents):
            # Create a unique short id
            vid = f"doc_{store.get_total_count() + idx + 1:04d}"
            # Extract first 30 chars as label
            label = doc[:30] + "..." if len(doc) > 30 else doc
            
            # Form metadata
            metadata = {
                "source": "AI Generation Mode",
                "text_snippet": doc,
                "severity": "Medium", # Default
                "timestamp": "2026-06-23T12:00:00Z"
            }
            
            new_vectors.append(VectorInput(
                id=vid,
                label=label,
                embedding=embeddings[idx],
                metadata=metadata
            ))
            
        summary = store.add_vectors(new_vectors)
        return summary
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Embeddings generation failed: {str(e)}"
        )
