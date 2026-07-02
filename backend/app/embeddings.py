import os
import json
import logging
import time
import requests
from typing import List, Optional, Tuple
from fastapi import HTTPException

try:
    from dotenv import load_dotenv
    # Robust dotenv loading across relative directories
    load_dotenv()
    # Parent directory (e.g. backend/ from backend/app/)
    parent_env = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(parent_env):
        load_dotenv(dotenv_path=parent_env)
    # Grandparent directory (e.g. root/ from backend/app/)
    grandparent_env = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    if os.path.exists(grandparent_env):
        load_dotenv(dotenv_path=grandparent_env)
except ImportError:
    pass

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
_env_validated = False

def validate_env() -> None:
    global _env_validated
    if _env_validated:
        return
    _env_validated = True
    """
    Validates environment variables.

    Logs loading process and selected provider.
    
    Setting GEMINI_API_KEY:
    - Local: Add GEMINI_API_KEY="your_api_key_here" to your local environment variables or .env file.
    - Render/Railway: Add GEMINI_API_KEY to the "Environment Variables" tab in your service settings dashboard.
    - Vercel: Add GEMINI_API_KEY under Project Settings > Environment Variables.
    """
    # Check for .env file in expected locations
    possible_paths = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    ]
    
    env_found = False
    found_path = ""
    for path in possible_paths:
        if os.path.exists(path):
            env_found = True
            found_path = os.path.abspath(path)
            break
            
    if env_found:
        logger.info(f"Embedding Startup: .env file found at '{found_path}'")
    else:
        logger.info("Embedding Startup: No .env file found in standard search paths (will rely on system environment variables)")

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        masked_key = gemini_key[:8] + "..." + gemini_key[-4:] if len(gemini_key) > 12 else "configured (short key)"
        logger.info(f"Embedding Startup: GEMINI_API_KEY loaded successfully ({masked_key})")
        logger.info("Embedding Startup: Active Default Provider is Gemini (Cloud API)")
    else:
        logger.warning("Embedding Startup Check: GEMINI_API_KEY is missing!")
        logger.info("Embedding Startup: Active Default Provider is Local MiniLM (all-MiniLM-L6-v2)")

def run_startup_embedding_check() -> None:
    """
    Runs a test embedding generation on startup to confirm the selected provider is functional.
    Does not crash the application if it fails.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    test_doc = ["Startup diagnostic test string."]
    
    if gemini_key:
        provider = "gemini"
    else:
        provider = "sentence-transformers"
        
    logger.info(f"Embedding Startup Diagnostic: Running test embedding using provider '{provider}'...")
    try:
        t0 = time.time()
        embs, model_used = generate_embeddings(provider=provider, documents=test_doc)
        elapsed = time.time() - t0
        if embs and len(embs) > 0:
            logger.info(
                f"Embedding Startup Diagnostic SUCCESS: Generated 1 embedding of dimension {len(embs[0])} "
                f"using model '{model_used}' (provider: '{provider}') in {elapsed:.2f}s"
            )
        else:
            logger.error(f"Embedding Startup Diagnostic FAILED: No embeddings returned for provider '{provider}'")
    except Exception as e:
        logger.error(f"Embedding Startup Diagnostic FAILED for provider '{provider}': {str(e)}")
        if provider == "gemini":
            logger.info("Embedding Startup Diagnostic: Attempting diagnostic fallback check using sentence-transformers...")
            try:
                t0 = time.time()
                embs, model_used = generate_embeddings(provider="sentence-transformers", documents=test_doc)
                elapsed = time.time() - t0
                logger.info(
                    f"Embedding Startup Diagnostic SUCCESS (Diagnostic Fallback): Generated 1 embedding of dimension "
                    f"{len(embs[0])} using model '{model_used}' in {elapsed:.2f}s"
                )
            except Exception as fe:
                logger.error(f"Embedding Startup Diagnostic FAILED (Diagnostic Fallback): {str(fe)}")

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

def get_gemini_embeddings(
    documents: List[str],
    model_name: str = "gemini-embedding-001",
    batch_size: int = 100
) -> List[List[float]]:
    """
    Generates embeddings using Google GenAI SDK with gemini-embedding-001 in batches.
    If it fails after retries, raises an exception.
    """
    if not documents:
        return []

    validate_env()
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise HTTPException(
            status_code=400,
            detail="GEMINI_API_KEY environment variable is not set. Please configure it to use Gemini embeddings."
        )

    client = get_gemini_client()
    if not client:
        raise HTTPException(
            status_code=500,
            detail="Gemini Client could not be initialized. Please check that 'google-genai' is installed."
        )

    # Batch processing
    batches = [documents[i:i + batch_size] for i in range(0, len(documents), batch_size)]
    logger.info(f"Gemini API: Processing {len(documents)} records in {len(batches)} batches (size: {batch_size})")
    
    all_embeddings = []
    max_retries = 3
    retry_delay = 2.0
    
    for batch_idx, batch in enumerate(batches, 1):
        logger.info(f"Gemini API: Processing batch {batch_idx}/{len(batches)} (size: {len(batch)})")
        batch_success = False
        
        for attempt in range(1, max_retries + 1):
            try:
                t0 = time.time()
                result = client.models.embed_content(
                    model=model_name,
                    contents=batch
                )
                elapsed = time.time() - t0
                
                embs = [emb.values for emb in result.embeddings]
                logger.info(f"Gemini API: Batch {batch_idx} success, generated {len(embs)} embeddings in {elapsed:.2f}s")
                all_embeddings.extend(embs)
                batch_success = True
                break
            except Exception as api_err:
                err_msg = str(api_err)
                is_429 = "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg
                
                sleep_time = retry_delay * (2 ** (attempt - 1))
                if is_429:
                    sleep_time += 5.0
                    logger.warning(
                        f"Gemini API Rate Limit (429) hit on batch {batch_idx}, attempt {attempt}/{max_retries}. "
                        f"Waiting {sleep_time:.2f}s before retry..."
                    )
                else:
                    logger.warning(
                        f"Gemini API batch {batch_idx} attempt {attempt}/{max_retries} failed: {err_msg}. "
                        f"Retrying in {sleep_time:.2f}s..."
                    )
                
                if attempt == max_retries:
                    logger.error(f"Gemini API failed all {max_retries} attempts for batch {batch_idx}.")
                    raise api_err
                    
                time.sleep(sleep_time)
                
    return all_embeddings

def get_sentence_transformer_embeddings(
    documents: List[str],
    model_name: str = "all-MiniLM-L6-v2",
    api_key: Optional[str] = None,
    batch_size: int = 100
) -> List[List[float]]:
    """
    Generates embeddings using the local sentence-transformers/all-MiniLM-L6-v2 model in batches.
    """
    if not documents:
        return []

    try:
        t0 = time.time()
        model = get_local_model()
        
        # Batch processing
        batches = [documents[i:i + batch_size] for i in range(0, len(documents), batch_size)]
        logger.info(f"Local MiniLM: Processing {len(documents)} records in {len(batches)} batches (size: {batch_size})")
        
        all_embeddings = []
        for batch_idx, batch in enumerate(batches, 1):
            logger.info(f"Local MiniLM: Processing batch {batch_idx}/{len(batches)} (size: {len(batch)})")
            raw_embeddings = model.encode(batch)
            all_embeddings.extend(raw_embeddings.tolist())
            
        elapsed = time.time() - t0
        logger.info(
            f"Embedding Provider: Local MiniLM | Successfully generated {len(documents)} "
            f"embeddings in {elapsed:.2f}s"
        )
        return all_embeddings
    except Exception as err:
        logger.error(f"Local MiniLM embedding generation failed: {str(err)}")
        raise HTTPException(
            status_code=500,
            detail=f"Local MiniLM embedding generation failed: {str(err)}"
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
    azure_deployment: Optional[str] = None,
    batch_size: int = 100
) -> Tuple[List[List[float]], str]:
    """
    Orchestrator to generate embeddings based on provider selection.
    Returns a tuple of (embeddings, model_used).
    """
    if not documents:
        return [], ""

    provider = provider.lower()
    
    if provider == "gemini":
        model_name = model or "gemini-embedding-001"
        try:
            embeddings = get_gemini_embeddings(documents, model_name, batch_size)
            return embeddings, model_name
        except Exception as e:
            logger.warning(
                f"Gemini embedding generation failed after retries: {str(e)}. "
                "Falling back to local sentence-transformers/all-MiniLM-L6-v2..."
            )
            logger.info("Embedding Fallback: Using local Sentence Transformers model 'all-MiniLM-L6-v2' instead.")
            embeddings = get_sentence_transformer_embeddings(documents, "all-MiniLM-L6-v2", api_key, batch_size)
            return embeddings, "all-MiniLM-L6-v2"
            
    elif provider == "sentence-transformers":
        model_name = model or "all-MiniLM-L6-v2"
        embeddings = get_sentence_transformer_embeddings(documents, model_name, api_key, batch_size)
        return embeddings, model_name
        
    elif provider == "openai":
        model_name = model or "text-embedding-3-small"
        batches = [documents[i:i + batch_size] for i in range(0, len(documents), batch_size)]
        all_embeddings = []
        for batch in batches:
            embs = get_openai_embeddings(batch, api_key, model_name)
            all_embeddings.extend(embs)
        return all_embeddings, model_name
        
    elif provider == "azure":
        batches = [documents[i:i + batch_size] for i in range(0, len(documents), batch_size)]
        all_embeddings = []
        for batch in batches:
            embs = get_azure_openai_embeddings(batch, api_key, azure_endpoint, azure_deployment)
            all_embeddings.extend(embs)
        return all_embeddings, azure_deployment or "azure-deployment"
        
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported embedding provider '{provider}'.")
