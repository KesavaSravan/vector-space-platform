import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
import json
import logging
import time
import requests
from typing import List, Optional
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger("embeddings")
# Ensure logger has a handler if not already configured by fastapi
if not logger.handlers:
    logger.setLevel(logging.INFO)
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(ch)

# Global variables for caching clients and models to optimize production usage
_gemini_client = None
_local_model = None

def validate_env() -> None:
    """
    Validates environment variables at application startup.
    Logs warning if GEMINI_API_KEY is not configured.
    
    Setting GEMINI_API_KEY:
    - Local: Add GEMINI_API_KEY="your_api_key_here" to your local environment variables or .env file.
    - Render/Railway: Add GEMINI_API_KEY to the "Environment Variables" tab in your service settings dashboard.
    - Vercel: Add GEMINI_API_KEY under Project Settings > Environment Variables.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        logger.info("Embedding Startup Check: GEMINI_API_KEY is configured. Gemini is the active embedding provider.")
    else:
        logger.warning(
            "Embedding Startup Check: GEMINI_API_KEY is missing! "
            "The system will automatically run in Local Fallback mode using sentence-transformers/all-MiniLM-L6-v2."
        )

def get_gemini_client() -> Optional[object]:
    """
    Lazy-loads and caches the Google GenAI client instance.
    """
    global _gemini_client
    if _gemini_client is None:
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            return None
        try:
            from google import genai
            # Initialize the client once and reuse it
            _gemini_client = genai.Client(api_key=gemini_key)
        except ImportError:
            logger.error("Failed to import 'google-genai'. Please make sure it is installed.")
            return None
    return _gemini_client

def get_local_model() -> object:
    """
    Lazy-loads and caches the local SentenceTransformer fallback model in memory.
    """
    global _local_model
    if _local_model is None:
        logger.info("Embedding Provider: Local MiniLM | Model not in memory. Loading all-MiniLM-L6-v2 lazily...")
        t0 = time.time()
        try:
            from sentence_transformers import SentenceTransformer
            _local_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            logger.info(f"Loaded sentence-transformers/all-MiniLM-L6-v2 in {time.time() - t0:.2f}s")
        except Exception as e:
            logger.error(f"Failed to load sentence-transformers/all-MiniLM-L6-v2: {str(e)}")
            raise RuntimeError(f"Failed to load local fallback model: {str(e)}")
    return _local_model

def get_sentence_transformer_embeddings(
    documents: List[str],
    model_name: str = "all-MiniLM-L6-v2",
    api_key: Optional[str] = None
) -> List[List[float]]:
    """
    Generates embeddings using a hybrid strategy:
    1. Primary: Gemini API (gemini-embedding-001) using Google GenAI SDK.
    2. Fallback: Local sentence-transformers/all-MiniLM-L6-v2.
    """
    if not documents:
        return []

    # Retrieve the API key from environment variable exclusively
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if gemini_key:
        try:
            client = get_gemini_client()
            if client:
                logger.info("Embedding Provider: Gemini | Starting embedding generation...")
                
                # Retry logic for Gemini API calls
                max_retries = 3
                retry_delay = 1.0
                embeddings = None
                
                for attempt in range(1, max_retries + 1):
                    try:
                        t0 = time.time()
                        # Call gemini-embedding-001 using Google GenAI SDK
                        result = client.models.embed_content(
                            model="gemini-embedding-001",
                            contents=documents
                        )
                        elapsed = time.time() - t0
                        
                        # Extract float lists from response
                        embeddings = [emb.values for emb in result.embeddings]
                        
                        logger.info(
                            f"Embedding Provider: Gemini | Successfully generated {len(embeddings)} "
                            f"embeddings in {elapsed:.2f}s"
                        )
                        break
                    except Exception as api_err:
                        logger.warning(
                            f"Gemini API call attempt {attempt}/{max_retries} failed: {str(api_err)}"
                        )
                        if attempt == max_retries:
                            raise api_err
                        time.sleep(retry_delay * attempt)
                
                if embeddings:
                    return embeddings
            else:
                logger.warning("Gemini Client could not be initialized.")
        except Exception as e:
            logger.warning(
                f"Fallback Event: Gemini API failed to generate embeddings. "
                f"API Error: {str(e)}. Switching to local MiniLM fallback..."
            )

    # Local fallback path
    try:
        t0 = time.time()
        model = get_local_model()
        logger.info("Embedding Provider: Local MiniLM | Starting embedding generation...")
        raw_embeddings = model.encode(documents)
        elapsed = time.time() - t0
        logger.info(
            f"Embedding Provider: Local MiniLM | Successfully generated {len(documents)} "
            f"embeddings in {elapsed:.2f}s"
        )
        return raw_embeddings.tolist()
    except Exception as fallback_err:
        logger.error(f"Local MiniLM embedding generation failed: {str(fallback_err)}")
        raise HTTPException(
            status_code=500,
            detail=f"Both Gemini and local fallback embedding generation failed: {str(fallback_err)}"
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
