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
    rag_mode: str = "hybrid",
    top_k: int = 5
) -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    """
    Orchestrates the LLM execution using LangChain, with Hybrid Graph RAG retrieval
    (Vector + NetworkX Subgraphs + Community Summaries).
    Returns (answer_text, context_nodes, ui_actions, graph_paths, graph_triples).
    """
    if not LANGCHAIN_CHAT_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="LangChain Groq or Gemini libraries are not available on the server."
        )

    provider = provider.lower()
    rag_mode = (rag_mode or "hybrid").lower()
    
    # 1. Retrieve RAG Context if requested
    context_nodes = []
    context_text_block = ""
    graph_paths = []
    graph_triples = []
    
    if use_rag:
        if not store.has_vectors():
            raise HTTPException(
                status_code=400,
                detail="RAG is enabled, but no vectors are loaded in the system. Please upload data first."
            )

        dim = store.get_dimension()
        logger.info(f"Graph RAG: Retrieving context (mode={rag_mode}, dim={dim}).")

        # Handle Community Global Summary Mode
        if rag_mode == "community":
            from app.graph import graph_store
            from app.graph_rag import generate_community_summaries
            if not graph_store.community_summaries:
                generate_community_summaries(provider=provider, model=model, api_key=api_key)
            
            comm_summaries = graph_store.community_summaries
            if comm_summaries:
                context_text_block += "### Global Community Clusters & Corpus Overview:\n"
                for cid, summary_text in comm_summaries.items():
                    context_text_block += f"- **Community #{cid}**: {summary_text}\n"
            else:
                context_text_block += f"Corpus contains {len(graph_store.communities)} topological clusters.\n"

        # Handle Hybrid / Vector / Graph Mode
        else:
            try:
                from app.graph_rag import retrieve_graph_rag_context
                graph_ctx = retrieve_graph_rag_context(
                    query=message,
                    top_k=top_k,
                    hops=2,
                    embedding_api_key=embedding_api_key
                )
                
                vector_matches = graph_ctx.get("vector_results", [])
                graph_triples = graph_ctx.get("triples_text", [])
                graph_paths = graph_ctx.get("paths", [])
                paths_text = graph_ctx.get("paths_text", [])

                # Map retrieved matches into context_nodes
                for idx, match in enumerate(vector_matches, 1):
                    vid = match["id"]
                    vector_info = store.get_vector(vid)
                    if vector_info:
                        context_nodes.append({
                            "id": vid,
                            "label": match.get("label", vid),
                            "score": match.get("score", 0.0),
                            "metadata": match.get("metadata", {})
                        })
                        
                        meta = match.get("metadata", {})
                        text = get_vector_text(vector_info)
                        severity = meta.get("severity", meta.get("priority", "Low"))
                        category = meta.get("category", meta.get("Category", "General"))
                        ci = meta.get("configuration_item", meta.get("Configuration item", meta.get("service", "N/A")))
                        grp = meta.get("assignment_group", meta.get("Assignment group", "N/A"))
                        state_val = meta.get("state", meta.get("State", "N/A"))
                        res_notes = meta.get("resolution_notes", meta.get("Resolution notes", ""))
                        
                        ticket_summary = f"[{idx}] Document/Ticket ID: {vid} | Priority: {severity} | State: {state_val} | Category: {category} | Component/CI: {ci}\n"
                        ticket_summary += f"    Content: \"{text}\"\n"
                        if res_notes:
                            ticket_summary += f"    Resolution/Notes: \"{res_notes}\"\n"
                        context_text_block += ticket_summary

                # Append Knowledge Graph facts & Multi-Hop Paths if hybrid/graph mode
                if rag_mode in ["hybrid", "graph"] and (graph_triples or paths_text):
                    context_text_block += "\n--- EXTRACTED KNOWLEDGE GRAPH FACTS & SUBGRAPH RELATIONS ---\n"
                    if paths_text:
                        context_text_block += "Multi-Hop Reasoning Paths:\n"
                        for p in paths_text:
                            context_text_block += f"  • {p}\n"
                    if graph_triples:
                        context_text_block += "Direct & 2-Hop Subgraph Triples:\n"
                        for t in graph_triples[:20]:
                            context_text_block += f"  • {t}\n"

            except Exception as e:
                logger.error(f"Graph RAG Retrieval failed: {str(e)}")
                context_text_block = f"Note: Context retrieval encountered an error: {str(e)}.\n"

    # 2. Build system instructions
    system_prompt = (
        "You are an Advanced Graph RAG AI Assistant and Domain Reasoning Copilot for the Vector Space Platform.\n"
        "You analyze datasets, ServiceNow ITSM tickets, logs, knowledge bases, and multi-dimensional vector spaces.\n"
        "You leverage both dense semantic similarity and structured knowledge graph relational triples (entities, multi-hop dependencies, causes, and communities).\n"
    )
    
    if use_rag:
        system_prompt += (
            "\nRetrieved Knowledge Context (Dense Vectors + Knowledge Graph Triples):\n"
            f"{context_text_block}\n\n"
            "RESPONSE GUIDELINES:\n"
            "1. Synthesize both the document text and the Knowledge Graph relationships (e.g. dependencies, causes, configuration items).\n"
            "2. If multi-hop paths exist, explicitly mention how entities connect (e.g., 'Entity A affects Entity B which leads to Entity C').\n"
            "3. Cite specific Document/Ticket IDs (e.g. INC0010001 or doc_12) and entity names.\n"
            "4. Provide a structured, clean Markdown breakdown with:\n"
            "   - **Summary / Root-Cause Pattern**\n"
            "   - **Key Relational Findings (Graph Insights & Entities)**\n"
            "   - **Recommended Actions / Resolution Steps**\n"
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
        return cleaned_answer, context_nodes, ui_actions, graph_paths, graph_triples
    except Exception as e:
        logger.error(f"LLM generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"LLM execution failed: {str(e)}"
        )
