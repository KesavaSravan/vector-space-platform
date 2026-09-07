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


def parse_ui_actions(text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Looks for <ui_actions>[...]</ui_actions> in the text.
    Extracts the JSON array, parses it, removes the XML tags and content from the text,
    and returns (cleaned_text, ui_actions_list).
    """
    import re
    import json
    pattern = r"<ui_actions>(.*?)</ui_actions>"
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        return text, []
    
    json_str = match.group(1).strip()
    cleaned_text = re.sub(pattern, "", text, flags=re.DOTALL).strip()
    
    try:
        ui_actions = json.loads(json_str)
        if isinstance(ui_actions, list):
            return cleaned_text, ui_actions
        elif isinstance(ui_actions, dict):
            return cleaned_text, [ui_actions]
    except Exception as e:
        logger.warning(f"Failed to parse ui_actions JSON: {str(e)}")
        
    return cleaned_text, []

def run_chat_query(
    message: str,
    chat_history: List[ChatMessage],
    provider: str = "gemini",
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    embedding_api_key: Optional[str] = None,
    use_rag: bool = False,
    top_k: int = 5
) -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Orchestrates the LLM execution using LangChain, with optional RAG retrieval
    from the VectorStore. Returns a tuple of (answer_text, context_nodes, ui_actions).
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
                        
                        meta = match["metadata"]
                        text = get_vector_text(vector_info)
                        severity = meta.get("severity", meta.get("priority", "Low"))
                        category = meta.get("category", meta.get("Category", "General"))
                        ci = meta.get("configuration_item", meta.get("Configuration item", "N/A"))
                        grp = meta.get("assignment_group", meta.get("Assignment group", "N/A"))
                        state_val = meta.get("state", meta.get("State", "N/A"))
                        res_notes = meta.get("resolution_notes", meta.get("Resolution notes", ""))
                        
                        ticket_summary = f"[{idx}] Ticket ID: {match['id']} | Priority: {severity} | State: {state_val} | Category: {category} | CI: {ci} | Group: {grp}\n"
                        ticket_summary += f"    Content: \"{text}\"\n"
                        if res_notes:
                            ticket_summary += f"    Resolution Notes: \"{res_notes}\"\n"
                        context_text_block += ticket_summary
        except Exception as e:
            logger.error(f"RAG Retrieval failed: {str(e)}")
            context_text_block = f"Note: Context retrieval failed due to: {str(e)}.\n"

    # 2. Build system instructions
    system_prompt = (
        "You are the ServiceNow AI Incident & ITSM Resolution Copilot for the Vector Space Platform.\n"
        "Your role is to assist IT Engineers, Service Desk Analysts, SREs, and IT Managers in analyzing ServiceNow incidents, problems, changes, and operational tickets.\n"
    )
    
    if use_rag:
        system_prompt += (
            "\nRetrieved ServiceNow Context from Vector Space:\n"
            f"{context_text_block}\n"
            "MANDATORY RESPONSE FORMATTING GUIDELINES:\n"
            "Structure your answer using this professional, clean ServiceNow ITSM Markdown format:\n\n"
            "### **Root-cause pattern**\n"
            "Start by mentioning all cited incident IDs (e.g., INC0010001, INC0010002) and summarizing the common pattern:\n"
            "* **Symptom:** Detailed description of what users or systems experience.\n"
            "* **Technical detail:** Exact error messages, protocols, services, or stack traces.\n"
            "* **Root cause:** The core underlying fault identified across the matching tickets.\n\n"
            "---\n\n"
            "### Proven resolution steps (from the tickets)\n"
            "Provide a clear Markdown Table summarizing the verified fixes from the retrieved tickets:\n"
            "| Ticket | Component / CI | Key resolution note |\n"
            "|---|---|---|\n"
            "| **INC...** (`ci-name`) | Action taken in ticket |\n\n"
            "---\n\n"
            "### Step-by-step \"how-to\" for resolving this issue\n"
            "Provide a numbered, actionable IT remediation guide (e.g., 1. Confirm the issue, 2. Apply fix, 3. Validate, 4. Prevent recurrence checklist).\n\n"
            "---\n\n"
            "### What the data tells us about the environment\n"
            "Provide a summary table and insights regarding impacted systems:\n"
            "| Affected CIs | Assignment Group | Priority Trend |\n"
            "|---|---|---|\n"
            "| `ci-name` | **Team Name** | **Critical / High / Medium** |\n\n"
            "* **Recurring pattern:** Operational summary of frequency and affected modules.\n"
            "* **Prevention & Governance:** Proactive monitoring, configuration, and maintenance recommendations.\n\n"
            "ALWAYS cite specific Ticket IDs (e.g. INC0010001). Never use vague statements when ticket details are available.\n"
        )
    else:
        system_prompt += (
            "\nNote: The user did not enable RAG context retrieval for this request. "
            "Explain ServiceNow concepts or IT troubleshooting generally, or remind them to enable RAG to search their active ServiceNow dataset."
        )

    system_prompt += (
        "\n\nUI CONTROL CAPABILITIES:\n"
        "You can control the 3D visualization and dashboard UI on behalf of the user by writing commands. If the user asks you to filter, color, or select specific points, or if doing so would help answer their question visually, you MUST include a list of UI commands at the end of your response inside a <ui_actions>[...]</ui_actions> XML block.\n"
        "Format the contents of the block as a valid JSON array of objects.\n"
        "Supported actions:\n"
        "1. {\"action\": \"set_color_by\", \"value\": \"cluster\" | \"severity\" | \"metadata:<key>\"}\n"
        "2. {\"action\": \"set_filter\", \"field\": \"severityFilter\" | \"clusterFilter\" | \"search\" | \"metadataKey\" | \"metadataValue\", \"value\": string}\n"
        "3. {\"action\": \"select_node\", \"id\": string}\n"
        "4. {\"action\": \"reset_filters\"}\n\n"
        "Example: If the user asks about database or VPN issues, at the very end of your response write:\n"
        "<ui_actions>[\n"
        "  {\"action\": \"set_color_by\", \"value\": \"severity\"},\n"
        "  {\"action\": \"set_filter\", \"field\": \"search\", \"value\": \"VPN\"}\n"
        "]</ui_actions>\n"
        "Never mention the <ui_actions> tags to the user directly, they will be processed behind the scenes."
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
        model_name = model or "openai/gpt-oss-120b"
        try:
            llm = ChatGroq(
                model=model_name,
                api_key=groq_key,
                temperature=0.2
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize ChatGroq model ({model_name}): {str(e)}"
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
        cleaned_answer, ui_actions = parse_ui_actions(answer)
        return cleaned_answer, context_nodes, ui_actions
    except Exception as e:
        logger.error(f"LLM generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"LLM execution failed: {str(e)}"
        )
