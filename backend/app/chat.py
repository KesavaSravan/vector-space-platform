import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from fastapi import HTTPException
from app.models import ChatMessage
from app.store import store
from app.similarity import find_similar_vectors
from app.embeddings import generate_embeddings

# LangChain imports
try:
    from langchain_groq import ChatGroq
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    LANGCHAIN_CHAT_AVAILABLE = True
except ImportError as e:
    logging.error(f"LangChain Chat imports failed: {str(e)}")
    LANGCHAIN_CHAT_AVAILABLE = False

logger = logging.getLogger("chat")

def get_vector_text(v: Dict[str, Any]) -> str:
    """
    Extracts text snippet from a vector record.
    """
    metadata = v.get("metadata", {})
    return metadata.get("original_text") or metadata.get("text_snippet") or v.get("label") or ""

def text_based_keyword_search(query: str, all_vectors: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Fallback text-based keyword search when dimensions mismatch.
    Calculates a simple token-overlap score.
    """
    import re
    query_words = set(re.findall(r'\w+', query.lower()))
    stop_words = {"a", "an", "the", "is", "are", "was", "were", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "about", "how", "what", "why", "many", "number", "issue", "issues", "related"}
    query_words = query_words - stop_words
    
    if not query_words:
        query_words = set(re.findall(r'\w+', query.lower()))
        
    scored_matches = []
    for v in all_vectors:
        text = get_vector_text(v).lower()
        score = sum(1 for word in query_words if word in text)
        if score > 0:
            scored_matches.append((v, score))
            
    scored_matches.sort(key=lambda x: x[1], reverse=True)
    
    results = []
    for v, score in scored_matches[:top_k]:
        results.append({
            "id": v["id"],
            "label": v["label"],
            "score": float(score) / max(1, len(query_words)),
            "metadata": v["metadata"]
        })
    return results


def run_chat_query(
    message: str,
    chat_history: List[ChatMessage],
    provider: str = "gemini",
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    embedding_api_key: Optional[str] = None,
    use_rag: bool = False,
    top_k: int = 5
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Orchestrates the LLM execution using LangChain, with optional RAG retrieval
    from the VectorStore. Returns a tuple of (answer_text, context_nodes).
    """
    if not LANGCHAIN_CHAT_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="LangChain Groq or Gemini libraries are not available on the server."
        )

    provider = provider.lower()
    
    # 1. Retrieve RAG Context if requested
    context_nodes = []
    context_text_block = ""
    
    if use_rag:
        if not store.has_vectors():
            raise HTTPException(
                status_code=400,
                detail="RAG is enabled, but no vectors are loaded in the system. Please upload data first."
            )
            
        dim = store.get_dimension()
        if not dim:
            raise HTTPException(
                status_code=400,
                detail="Vector store dimension is not defined. Please upload valid vectors."
            )
            
        logger.info(f"RAG: Retrieving contexts for message. Vector space dimension is {dim}.")
        
        # Retrieve stored embedding metadata
        stored_provider = store.embedding_provider
        stored_model = store.embedding_model
        stored_key = store.embedding_api_key
        
        # Fallback to dimension-based defaults for legacy datasets (backwards compatibility)
        if not stored_provider:
            if dim == 768:
                stored_provider = "gemini"
                stored_model = "gemini-embedding-001"
            elif dim == 1536:
                stored_provider = "openai"
                stored_model = "text-embedding-3-small"
            elif dim == 384:
                stored_provider = "sentence-transformers"
                stored_model = "all-MiniLM-L6-v2"
            else:
                stored_provider = "precomputed"
                stored_model = "unknown"
                
        # If dataset was uploaded as precomputed, we cannot dynamically embed text queries
        if stored_provider in ["precomputed", "unknown"]:
            raise HTTPException(
                status_code=400,
                detail=f"This dataset was loaded with precomputed {dim}-D embeddings. The system does not know which embedding model was used. "
                       "Please regenerate the dataset embeddings using the AI Text Vectorization panel to enable semantic RAG chat."
            )
            
        # Determine the API key to use
        # Priority: 1) Overriden key in chat query, 2) Stored key from ingestion, 3) Environment variable
        emb_key = embedding_api_key or stored_key
        if not emb_key:
            if stored_provider == "gemini":
                emb_key = os.getenv("GEMINI_API_KEY")
            elif stored_provider == "openai":
                emb_key = os.getenv("OPENAI_API_KEY")
            elif stored_provider == "huggingface":
                emb_key = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACEHUB_API_TOKEN")
                
        # Validate API key presence for providers that require it
        if stored_provider in ["gemini", "openai", "huggingface"] and not emb_key:
            key_name = "Gemini API Key" if stored_provider == "gemini" else "OpenAI API Key" if stored_provider == "openai" else "Hugging Face Token"
            raise HTTPException(
                status_code=400,
                detail=f"The active dataset was created using '{stored_provider}' ({stored_model}), which requires an API key. "
                       f"Please provide your {key_name} in the Chat settings or configure it in the server environment."
            )
            
        emb_provider = stored_provider
        emb_model = stored_model
            
        try:
            # Embed the query
            query_embeddings, _ = generate_embeddings(
                provider=emb_provider,
                documents=[message],
                model=emb_model,
                api_key=emb_key
            )
            
            if query_embeddings:
                query_emb = query_embeddings[0]
                
                # Check for dimension alignment!
                if len(query_emb) != dim:
                    logger.info(
                        f"RAG: Dimension mismatch ({dim}-D store vs {len(query_emb)}-D query). "
                        "Falling back to keyword-based text search."
                    )
                    all_vectors = store.get_all_vectors()
                    matches = text_based_keyword_search(message, all_vectors, top_k)
                    context_text_block = (
                        f"Note: Vector dimension mismatch ({dim}-D dataset vs {len(query_emb)}-D query). "
                        "Retrieved relevant context points using keyword text search instead of vector similarity.\n"
                    )
                else:
                    # Query the persistent FAISS index directly inside VectorStore
                    matches = store.query_similarity(query_emb, top_k)
                
                # Map retrieved matches into context_nodes
                for idx, match in enumerate(matches, 1):
                    vector_info = store.get_vector(match["id"])
                    if vector_info:
                        # Append to context nodes for UI highlight
                        context_nodes.append({
                            "id": match["id"],
                            "label": match["label"],
                            "score": match["score"],
                            "metadata": match["metadata"]
                        })
                        
                        text = get_vector_text(vector_info)
                        severity = match["metadata"].get("severity", "Low")
                        source = match["metadata"].get("source", "Unknown")
                        context_text_block += f"[{idx}] (ID: {match['id']}, Severity: {severity}, Source: {source}): \"{text}\"\n"
        except Exception as e:
            logger.error(f"RAG Retrieval failed: {str(e)}")
            context_text_block = f"Note: Context retrieval failed due to: {str(e)}.\n"

    # 2. Build system instructions
    system_prompt = (
        "You are the AI Assistant for the Vector Space Visualization Platform.\n"
        "Your role is to help users analyze, interpret, and understand their high-dimensional datasets, clusters, and coordinates.\n"
    )
    
    if use_rag:
        system_prompt += (
            "\nRetrieved Contexts from Vector Space:\n"
            f"{context_text_block}\n"
            "INSTRUCTIONS:\n"
            "1. Answer the user's question using the retrieved contexts above.\n"
            "2. When referring to facts from the contexts, cite them by their [index] or ID (e.g., [1] or doc_0001) so the user knows which data point you reference.\n"
            "3. If the context does not contain enough information, state that clearly but provide a helpful response based on your general training data.\n"
        )
    else:
        system_prompt += (
            "\nNote: The user did not enable RAG context retrieval for this request. "
            "Explain concepts generally or ask them to enable context if they want to ask about their uploaded dataset."
        )

    # 3. Create LangChain LLM instance
    llm = None
    if provider == "groq":
        # Resolve Groq API key
        groq_key = api_key or os.getenv("GROQ_API_KEY")
        if not groq_key:
            raise HTTPException(
                status_code=400,
                detail="GROQ_API_KEY environment variable is not configured. Please supply it in the chat settings."
            )
        model_name = model or "llama-3.3-70b-versatile"
        try:
            llm = ChatGroq(
                model=model_name,
                api_key=groq_key,
                temperature=0.2
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize ChatGroq model: {str(e)}"
            )
            
    elif provider == "gemini":
        # Resolve Gemini API key
        gemini_key = api_key or os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            raise HTTPException(
                status_code=400,
                detail="GEMINI_API_KEY is not configured. Please supply it in the chat settings or env."
            )
        model_name = model or "gemini-2.5-flash"
        try:
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=gemini_key,
                temperature=0.2
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize ChatGoogleGenerativeAI model: {str(e)}"
            )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported chat LLM provider '{provider}'."
        )

    # 4. Formulate message history
    messages = [SystemMessage(content=system_prompt)]
    
    # Keep the last 15 history items to fit context window safely
    for msg in chat_history[-15:]:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            messages.append(AIMessage(content=msg.content))
            
    # Add the current query
    messages.append(HumanMessage(content=message))

    # 5. Invoke Model
    try:
        response = llm.invoke(messages)
        answer = str(response.content)
        return answer, context_nodes
    except Exception as e:
        logger.error(f"LLM generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"LLM execution failed: {str(e)}"
        )
