import os
import json
import requests
from typing import List, Optional
from fastapi import HTTPException

# Deprecated local models dict (no longer used since we use HF Inference API)
_transformer_models = {}

def get_sentence_transformer_embeddings(
    documents: List[str],
    model_name: str = "all-MiniLM-L6-v2",
    api_key: Optional[str] = None
) -> List[List[float]]:
    """
    Generates sentence embeddings using the Hugging Face Serverless Inference API
    instead of running models locally (saving RAM/CPU and removing torch dependency).
    """
    # Map short names like "all-MiniLM-L6-v2" to "sentence-transformers/all-MiniLM-L6-v2"
    full_model_name = model_name
    if "/" not in full_model_name:
        full_model_name = f"sentence-transformers/{model_name}"

    url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{full_model_name}"
    
    # Retrieve Hugging Face API key
    token = api_key or os.environ.get("HF_TOKEN") or os.environ.get("HF_API_KEY")
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    payload = {
        "inputs": documents,
        "options": {
            "wait_for_model": True
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        
        if response.status_code != 200:
            err_msg = response.text
            try:
                err_json = response.json()
                if "error" in err_json:
                    err_msg = err_json["error"]
            except Exception:
                pass
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Hugging Face API error: {err_msg}"
            )

        data = response.json()
        
        if not isinstance(data, list) or len(data) == 0:
            raise HTTPException(
                status_code=502,
                detail="Invalid response format from Hugging Face Inference API (expected a list)."
            )
            
        return data

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to Hugging Face Inference API: {str(e)}"
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during Hugging Face embedding generation: {str(e)}"
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
        return get_sentence_transformer_embeddings(documents, model or "all-MiniLM-L6-v2", api_key)
    elif provider == "openai":
        return get_openai_embeddings(documents, api_key, model)
    elif provider == "azure":
        return get_azure_openai_embeddings(documents, api_key, azure_endpoint, azure_deployment)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported embedding provider '{provider}'.")
