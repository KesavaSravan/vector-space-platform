import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, status, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import io
import pandas as pd

from app.models import (
    UploadVectorsJSONRequest,
    ReductionRequest,
    ClusteringRequest,
    SimilarityRequest,
    GenerateEmbeddingsRequest,
    GenerateEmbeddingsTextRequest,
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
from app.embeddings import generate_embeddings, validate_env
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

def parse_file_to_dataframe(file: UploadFile, content: bytes) -> pd.DataFrame:
    filename = file.filename or ""
    filename_lower = filename.lower()
    try:
        if filename_lower.endswith(".csv"):
            text_content = content.decode("utf-8", errors="replace")
            return pd.read_csv(io.StringIO(text_content))
        elif filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls"):
            return pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload an Excel (.xlsx/.xls) or CSV (.csv) file."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse file: {str(e)}"
        )

@app.post("/parse-headers")
async def parse_headers(file: UploadFile = File(...)):
    """
    Accepts an Excel (.xlsx/.xls) or CSV (.csv) file, parses it,
    and returns all available column names (headers).
    """
    content = await file.read()
    df = parse_file_to_dataframe(file, content)
    headers = [str(col) for col in df.columns]
    return {"headers": headers}

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
    adds them to store, and returns upload summary metadata along with processing statistics.
    """
    import math
    import time
    try:
        raw_documents = request.documents or []
        total_records_processed = len(raw_documents)
        
        # Input validation: Trim whitespace, skip null/empty strings
        cleaned_documents = []
        for doc in raw_documents:
            if doc is not None:
                trimmed = str(doc).strip()
                if trimmed:
                    cleaned_documents.append(trimmed)
                    
        if not cleaned_documents:
            raise HTTPException(
                status_code=400, 
                detail="No valid non-empty documents found after validation."
            )

        provider = request.provider.lower()
        warning_msg = None
        
        # Enforce strict Gemini limit of 100 records to prevent quota exhaustion
        if provider == "gemini" and len(cleaned_documents) > 100:
            cleaned_documents = cleaned_documents[:100]
            warning_msg = "Warning: Platform limit active. Only the first 100 records were processed to stay within Gemini Free Tier limits."

        batch_size_used = request.batch_size or 100
        number_of_batches_processed = math.ceil(len(cleaned_documents) / batch_size_used)
        
        t0 = time.time()
        embeddings, model_used = generate_embeddings(
            provider=request.provider,
            documents=cleaned_documents,
            model=request.model,
            api_key=request.api_key,
            azure_endpoint=request.azure_endpoint,
            azure_deployment=request.azure_deployment,
            batch_size=batch_size_used
        )
        duration = time.time() - t0
        
        # Ingest as new VectorInputs
        new_vectors = []
        for idx, doc in enumerate(cleaned_documents):
            vid = f"doc_{store.get_total_count() + idx + 1:04d}"
            label = doc[:30] + "..." if len(doc) > 30 else doc
            
            metadata = {
                "source": "AI Generation Mode",
                "text_snippet": doc,
                "severity": "Medium",
                "timestamp": "2026-06-23T12:00:00Z"
            }
            
            new_vectors.append(VectorInput(
                id=vid,
                label=label,
                embedding=embeddings[idx],
                metadata=metadata
            ))
            
        summary = store.add_vectors(new_vectors)
        
        # Add the requested additional keys
        summary.update({
            "total_records_processed": total_records_processed,
            "total_embeddings_generated": len(embeddings),
            "batch_size_used": batch_size_used,
            "number_of_batches_processed": number_of_batches_processed,
            "embedding_model_used": model_used,
            "processing_duration": round(duration, 3)
        })
        if warning_msg:
            summary["warning"] = warning_msg
        
        return summary
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Embeddings generation failed: {str(e)}"
        )

@app.get("/embedding-diagnostic")
def embedding_diagnostic():
    """
    Diagnostic endpoint to check the state of embedding providers and env loading.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    has_gemini = gemini_key is not None
    
    # Mask key if present
    masked_key = None
    if has_gemini:
        masked_key = gemini_key[:8] + "..." + gemini_key[-4:] if len(gemini_key) > 12 else "configured (short key)"
        
    status_info = {
        "gemini_api_key_configured": has_gemini,
        "gemini_api_key_masked": masked_key,
        "active_default_provider": "gemini" if has_gemini else "sentence-transformers",
        "working_directory": os.getcwd(),
        "env_search_paths": [
            os.path.join(os.getcwd(), ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        ]
    }
    
    # Test file paths
    status_info["found_env_files"] = [
        path for path in status_info["env_search_paths"] if os.path.exists(path)
    ]
    
    try:
        from sentence_transformers import SentenceTransformer
        status_info["local_minilm_status"] = "available"
    except Exception as e:
        status_info["local_minilm_status"] = f"unavailable: {str(e)}"
        
    return status_info

@app.post("/generate-embeddings-text")
def generate_embeddings_text(request: GenerateEmbeddingsTextRequest):
    """
    Generates embeddings from a parsed text dataset matching the `Number - Text` format.
    Adds them to store and returns upload summary metadata along with processing statistics.
    """
    import math
    import time
    try:
        raw_text = request.text_data or ""
        lines = raw_text.splitlines()
        
        parsed_records = []
        for line_idx, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
            if "-" not in line:
                raise HTTPException(
                    status_code=400,
                    detail=f"Parsing error on line {line_idx}: Line must contain a '-' separator between Number and Text."
                )
            parts = line.split("-", 1)
            num_part = parts[0].strip()
            text_part = parts[1].strip()
            if not num_part:
                raise HTTPException(
                    status_code=400,
                    detail=f"Parsing error on line {line_idx}: Missing number before '-' separator."
                )
            if not text_part:
                raise HTTPException(
                    status_code=400,
                    detail=f"Parsing error on line {line_idx}: Missing text after '-' separator."
                )
            parsed_records.append({"number": num_part, "text": text_part})
            
        if not parsed_records:
            raise HTTPException(
                status_code=400,
                detail="No valid 'Number - Text' records found."
            )
            
        provider = request.provider.lower()
        warning_msg = None
        
        # Enforce Gemini limit
        if provider == "gemini" and len(parsed_records) > 100:
            parsed_records = parsed_records[:100]
            warning_msg = "Warning: Platform limit active. Only the first 100 records were processed to stay within Gemini Free Tier limits."
            
        cleaned_documents = [r["text"] for r in parsed_records]
        batch_size_used = request.batch_size or 100
        number_of_batches_processed = math.ceil(len(cleaned_documents) / batch_size_used)
        
        t0 = time.time()
        embeddings, model_used = generate_embeddings(
            provider=request.provider,
            documents=cleaned_documents,
            model=request.model,
            api_key=request.api_key,
            azure_endpoint=request.azure_endpoint,
            azure_deployment=request.azure_deployment,
            batch_size=batch_size_used
        )
        duration = time.time() - t0
        
        # Ingest as new VectorInputs
        new_vectors = []
        for idx, record in enumerate(parsed_records):
            vid = record["number"]
            doc = record["text"]
            label = doc[:30] + "..." if len(doc) > 30 else doc
            
            metadata = {
                "source": "AI Generation Mode (Text Ingest)",
                "original_number": record["number"],
                "original_text": doc,
                "severity": "Medium",
                "timestamp": "2026-07-02T20:45:00Z"
            }
            
            new_vectors.append(VectorInput(
                id=vid,
                label=label,
                embedding=embeddings[idx],
                metadata=metadata
            ))
            
        summary = store.add_vectors(new_vectors)
        
        # Add additional metadata keys
        summary.update({
            "total_records_processed": len(parsed_records),
            "total_embeddings_generated": len(embeddings),
            "batch_size_used": batch_size_used,
            "number_of_batches_processed": number_of_batches_processed,
            "embedding_model_used": model_used,
            "processing_duration": round(duration, 3)
        })
        if warning_msg:
            summary["warning"] = warning_msg
            
        return summary
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Embeddings generation failed: {str(e)}"
        )

@app.post("/generate-embeddings-file")
async def generate_embeddings_file(
    file: UploadFile = File(...),
    provider: str = Form(...),
    model: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None),
    azure_endpoint: Optional[str] = Form(None),
    azure_deployment: Optional[str] = Form(None),
    batch_size: int = Form(100),
    id_column: Optional[str] = Form(None),
    vector_columns: Optional[str] = Form(None)
):
    """
    Accepts an Excel (.xlsx/.xls) or CSV (.csv) file, parses the selected ID and vector columns
    (with dynamic mapping and validation), generates embeddings, and adds them to the store.
    """
    import math
    import time
    import json
    
    filename = file.filename or ""
    content = await file.read()
    df = parse_file_to_dataframe(file, content)
    
    parsed_records = []
    
    # Dynamic columns upload flow
    if id_column and vector_columns:
        if id_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Unique ID column '{id_column}' not found in the uploaded file."
            )
            
        # Parse vector columns parameter (can be JSON array or comma separated string)
        vector_cols = []
        try:
            parsed = json.loads(vector_columns)
            if isinstance(parsed, list):
                vector_cols = [str(c) for c in parsed]
            else:
                vector_cols = [str(vector_columns)]
        except Exception:
            vector_cols = [c.strip() for c in vector_columns.split(",") if c.strip()]
            
        for v_col in vector_cols:
            if v_col not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Vector column '{v_col}' not found in the uploaded file."
                )
                
        # Validate ID column for null or empty values
        null_count = int(df[id_column].isna().sum())
        if null_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Validation Error: Unique ID column '{id_column}' contains {null_count} null or empty values."
            )
            
        # Validate ID column for duplicates
        id_series = df[id_column].astype(str).str.strip()
        duplicates = id_series[id_series.duplicated(keep=False)].unique()
        if len(duplicates) > 0:
            duplicate_example = ", ".join(list(duplicates[:5]))
            if len(duplicates) > 5:
                duplicate_example += ", ..."
            raise HTTPException(
                status_code=400,
                detail=f"Validation Error: Unique ID column '{id_column}' contains duplicate values: {duplicate_example}"
            )
            
        # Combine columns and populate records
        for idx, row in df.iterrows():
            if pd.isna(row[id_column]):
                continue
            vid = str(row[id_column]).strip()
            if vid.endswith(".0"):
                vid = vid[:-2]
            if not vid:
                continue
                
            text_parts = []
            for col in vector_cols:
                val = row[col]
                if not pd.isna(val) and str(val).strip() != "":
                    text_parts.append(str(val).strip())
            combined_text = " ".join(text_parts)
            
            # Setup metadata containing all row properties
            row_metadata = {
                "source": f"AI Generation Mode ({filename})",
                "timestamp": "2026-07-11T20:33:41Z"
            }
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    row_metadata[str(col)] = None
                else:
                    if isinstance(val, (int, float, str, bool)):
                        row_metadata[str(col)] = val
                    else:
                        row_metadata[str(col)] = str(val)
            
            # For backwards-compatibility/dynamic UI mapping, also expose standard keys
            row_metadata["original_number"] = vid
            row_metadata["original_text"] = combined_text
            if "severity" not in row_metadata:
                row_metadata["severity"] = "Medium"
                
            parsed_records.append({
                "id": vid,
                "text": combined_text,
                "metadata": row_metadata
            })
            
    # Legacy fallback flow
    else:
        number_col = None
        text_col = None
        
        for col in df.columns:
            col_lower = str(col).strip().lower()
            if col_lower in ["number", "no.", "no", "id", "num"]:
                number_col = col
            if col_lower in ["text", "content", "document", "text 1", "text_1"]:
                text_col = col
                
        if not number_col and len(df.columns) > 0:
            number_col = df.columns[0]
        if not text_col and len(df.columns) > 1:
            text_col = df.columns[1]
            
        if not number_col or not text_col:
            raise HTTPException(
                status_code=400,
                detail="File must contain columns matching 'Number' and 'Text' (or at least two columns)."
            )
            
        for idx, row in df.iterrows():
            num_val = row[number_col]
            text_val = row[text_col]
            
            if pd.isna(num_val) or pd.isna(text_val):
                continue
                
            num_str = str(num_val).strip()
            text_str = str(text_val).strip()
            
            if num_str.endswith(".0"):
                num_str = num_str[:-2]
                
            if not num_str or not text_str:
                continue
                
            row_metadata = {
                "source": f"AI Generation Mode ({filename})",
                "original_number": num_str,
                "original_text": text_str,
                "severity": "Medium",
                "timestamp": "2026-07-02T20:58:00Z"
            }
            # Put other columns into metadata too
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    row_metadata[str(col)] = None
                else:
                    if isinstance(val, (int, float, str, bool)):
                        row_metadata[str(col)] = val
                    else:
                        row_metadata[str(col)] = str(val)
                        
            parsed_records.append({
                "id": num_str,
                "text": text_str,
                "metadata": row_metadata
            })
            
    if not parsed_records:
        raise HTTPException(
            status_code=400,
            detail="No valid rows containing values were found."
        )
        
    provider = provider.lower()
    warning_msg = None
    
    if provider == "gemini" and len(parsed_records) > 100:
        parsed_records = parsed_records[:100]
        warning_msg = "Warning: Platform limit active. Only the first 100 records were processed to stay within Gemini Free Tier limits."
        
    cleaned_documents = [r["text"] for r in parsed_records]
    batch_size_used = batch_size or 100
    number_of_batches_processed = math.ceil(len(cleaned_documents) / batch_size_used)
    
    t0 = time.time()
    try:
        embeddings, model_used = generate_embeddings(
            provider=provider,
            documents=cleaned_documents,
            model=model,
            api_key=api_key,
            azure_endpoint=azure_endpoint,
            azure_deployment=azure_deployment,
            batch_size=batch_size_used
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Embeddings generation failed: {str(e)}"
        )
        
    duration = time.time() - t0
    
    new_vectors = []
    for idx, record in enumerate(parsed_records):
        vid = record["id"]
        doc = record["text"]
        label = doc[:30] + "..." if len(doc) > 30 else doc
        
        new_vectors.append(VectorInput(
            id=vid,
            label=label,
            embedding=embeddings[idx],
            metadata=record["metadata"]
        ))
        
    summary = store.add_vectors(new_vectors)
    
    # Add additional metadata keys
    summary.update({
        "total_records_processed": len(parsed_records),
        "total_embeddings_generated": len(embeddings),
        "batch_size_used": batch_size_used,
        "number_of_batches_processed": number_of_batches_processed,
        "embedding_model_used": model_used,
        "processing_duration": round(duration, 3)
    })
    if warning_msg:
        summary["warning"] = warning_msg
        
    return summary

@app.get("/download-embeddings-csv")
def download_embeddings_csv():
    """
    Downloads all currently stored vectors as a CSV file with the structure:
    Number | Text | Dimension_1 | Dimension_2 | ... | Dimension_N
    """
    import io
    import pandas as pd
    
    if not store.has_vectors():
        raise HTTPException(
            status_code=400,
            detail="No vectors are loaded in the system. Please ingest or generate vectors first."
        )
        
    all_vectors = store.get_all_vectors()
    rows = []
    
    for v in all_vectors:
        row = {
            "Number": v["metadata"].get("original_number", v["id"]),
            "Text": v["metadata"].get("original_text", v["label"])
        }
        embedding = v["embedding"]
        for i, val in enumerate(embedding, 1):
            row[f"Dimension_{i}"] = val
        rows.append(row)
        
    df = pd.DataFrame(rows)
    
    # Write to memory buffer
    output = io.StringIO()
    try:
        df.to_csv(output, index=False)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate CSV file: {str(e)}"
        )
        
    csv_bytes = output.getvalue().encode("utf-8")
    
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=vector_embeddings.csv"
        }
    )


