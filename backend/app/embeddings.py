import json
import requests
from typing import List, Optional
from fastapi import HTTPException

# Lazy loaded SentenceTransformer
_transformer_models = {}

def get_sentence_transformer_embeddings(documents: List[str], model_name: str = "all-MiniLM-L6-v2") -> List[List[float]]:
    """
    Generates embeddings locally using Sentence Transformers.
    """
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        raise HTTPException(
            status_code=400,
            detail="The 'sentence-transformers' package is not installed on the backend. Please install it or use OpenAI/Azure providers."
        )
    
    global _transformer_models
    if model_name not in _transformer_models:
        try:
            # Load model
            _transformer_models[model_name] = SentenceTransformer(model_name)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load sentence-transformer model '{model_name}': {str(e)}"
            )

    try:
        model = _transformer_models[model_name]
        embeddings = model.encode(documents)
        # Convert numpy array to list of lists of floats
        return embeddings.tolist()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Sentence-transformer embedding generation failed: {str(e)}"
        )

def get_openai_embeddings(
    documents: List[str],
    api_key: str,
    model_name: Optional[str] = None
) -> List[List[float]]:
    """
    Generates embeddings using the OpenAI API.
    """
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API Key is required.")

    model = model_name or "text-embedding-3-small"
    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "input": documents,
        "model": model
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        if response.status_code != 200:
            err_msg = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"OpenAI API error: {err_msg}"
            )
        
        data = response.json()
        # OpenAI returns embeddings in the order of input documents, but let's sort just in case
        embeddings_sorted = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in embeddings_sorted]
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to OpenAI API: {str(e)}"
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during OpenAI embedding generation: {str(e)}"
        )

def get_azure_openai_embeddings(
    documents: List[str],
    api_key: str,
    azure_endpoint: str,
    azure_deployment: str
) -> List[List[float]]:
    """
    Generates embeddings using Azure OpenAI Service.
    """
    if not api_key:
        raise HTTPException(status_code=400, detail="Azure API Key is required.")
    if not azure_endpoint:
        raise HTTPException(status_code=400, detail="Azure Endpoint is required.")
    if not azure_deployment:
        raise HTTPException(status_code=400, detail="Azure Deployment name is required.")

    # Remove trailing slash from endpoint if present
    endpoint = azure_endpoint.rstrip("/")
    url = f"{endpoint}/openai/deployments/{azure_deployment}/embeddings?api-version=2023-05-15"
    
    headers = {
        "Content-Type": "application/json",
        "api-key": api_key
    }
    payload = {
        "input": documents
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        if response.status_code != 200:
            err_msg = response.text
            try:
                err_json = response.json()
                if "error" in err_json:
                    err_msg = err_json["error"].get("message", err_msg)
            except Exception:
                pass
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Azure OpenAI API error: {err_msg}"
            )

        data = response.json()
        embeddings_sorted = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in embeddings_sorted]
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to Azure OpenAI endpoint: {str(e)}"
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during Azure embedding generation: {str(e)}"
        )

def generate_embeddings(
    provider: str,
    documents: List[str],
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    azure_endpoint: Optional[str] = None,
    azure_deployment: Optional[str] = None
) -> List[List[float]]:
    """
    Orchestrator to generate embeddings based on provider selection.
    """
    if not documents:
        return []

    provider = provider.lower()
    if provider == "sentence-transformers":
        return get_sentence_transformer_embeddings(documents, model or "all-MiniLM-L6-v2")
    elif provider == "openai":
        return get_openai_embeddings(documents, api_key, model)
    elif provider == "azure":
        return get_azure_openai_embeddings(documents, api_key, azure_endpoint, azure_deployment)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported embedding provider '{provider}'.")
