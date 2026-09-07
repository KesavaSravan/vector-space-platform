import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple, Set
from app.graph import graph_store
from app.store import store
from app.similarity import find_similar_vectors
from app.models import ChatMessage

logger = logging.getLogger("graph_rag")

# LangChain LLM imports
try:
    from langchain_groq import ChatGroq
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import SystemMessage, HumanMessage
    LANGCHAIN_AVAILABLE = True
except ImportError as e:
    LANGCHAIN_AVAILABLE = False
    logger.warning(f"Graph RAG: LangChain imports unavailable: {str(e)}")


def clean_json_text(text: str) -> str:
    """Extracts valid JSON payload from markdown backticks or raw text."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def extract_triples_with_llm(
    text: str,
    provider: str = "gemini",
    model: Optional[str] = None,
    api_key: Optional[str] = None
) -> List[Dict[str, str]]:
    """
    Uses an LLM to extract (subject, relation, object) triples and entity types from text.
    Returns a list of dicts: [{"subject": ..., "relation": ..., "object": ...}]
    """
    if not LANGCHAIN_AVAILABLE:
        return []

    system_prompt = (
        "You are an expert Knowledge Graph Information Extraction AI.\n"
        "Extract key entities and their semantic relationships from the provided text.\n"
        "Return a strictly valid JSON array of objects with keys: 'subject', 'relation', 'object'.\n"
        "Rules:\n"
        "1. Keep relations concise and capitalized snake_case (e.g. 'DEPENDS_ON', 'CAUSES', 'BELONGS_TO', 'CONFIGURED_WITH', 'AFFECTS', 'REPORTED_BY', 'RESOLVED_BY').\n"
        "2. Subjects and objects must be clean entity or concept names (e.g. 'PaymentService', 'High CPU Spike', 'PostgreSQL DB').\n"
        "3. If no clear relations exist, extract at least the main entity and its category (e.g. subject: 'Issue-123', relation: 'HAS_CATEGORY', object: 'Database').\n"
        "4. Output ONLY the JSON array inside a ```json ``` block, with no other commentary."
    )

    resolved_api_key = api_key or (
        os.getenv("GEMINI_API_KEY") if provider == "gemini" else os.getenv("GROQ_API_KEY")
    )
    if not resolved_api_key:
        return []

    try:
        import os
        if provider == "groq":
            llm = ChatGroq(
                model=model or "llama-3.3-70b-versatile",
                groq_api_key=resolved_api_key,
                temperature=0.1,
                max_tokens=500
            )
        else: # Gemini default
            llm = ChatGoogleGenerativeAI(
                model=model or "gemini-2.5-flash",
                google_api_key=resolved_api_key,
                temperature=0.1,
                max_output_tokens=500
            )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Text to extract relations from:\n{text[:1500]}")
        ]

        response = llm.invoke(messages)
        content = clean_json_text(response.content if hasattr(response, "content") else str(response))
        triples = json.loads(content)
        if isinstance(triples, list):
            valid_triples = []
            for item in triples:
                if isinstance(item, dict) and "subject" in item and "relation" in item and "object" in item:
                    valid_triples.append({
                        "subject": str(item["subject"]).strip(),
                        "relation": str(item["relation"]).strip().upper().replace(" ", "_"),
                        "object": str(item["object"]).strip()
                    })
            return valid_triples
    except Exception as e:
        logger.warning(f"LLM Triple extraction failed: {str(e)}")

    return []


def extract_heuristic_relations(vectors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Fast rule-based entity & relation extraction without LLM costs.
    Connects documents by shared metadata (service, source, severity),
    cluster proximity, and label overlap.
    """
    edges = []
    metadata_keys_to_index = ["service", "source", "severity", "category", "component", "assignee", "status"]
    
    # 1. Map metadata values to entity nodes
    for v in vectors:
        vid = v.get("id")
        label = v.get("label", vid)
        meta = v.get("metadata", {})

        # Add DOCUMENT node to graph
        graph_store.add_node(node_id=vid, label=label, node_type="DOCUMENT", vector_id=vid, metadata=meta)

        for key in metadata_keys_to_index:
            val = meta.get(key)
            if val and isinstance(val, str) and len(val.strip()) > 1:
                val_clean = val.strip()
                entity_node_id = f"{key.upper()}:{val_clean}"
                graph_store.add_node(node_id=entity_node_id, label=val_clean, node_type="ENTITY", metadata={"category": key})
                
                # Relate Document -> Metadata Entity
                rel_name = f"HAS_{key.upper()}"
                graph_store.add_edge(source=vid, target=entity_node_id, relation=rel_name, weight=1.0)
                edges.append({"source": vid, "target": entity_node_id, "relation": rel_name})

        # Cluster relation
        cluster_id = v.get("cluster")
        if cluster_id is not None:
            cluster_node_id = f"CLUSTER_{cluster_id}"
            graph_store.add_node(node_id=cluster_node_id, label=f"Cluster {cluster_id}", node_type="CLUSTER")
            graph_store.add_edge(source=vid, target=cluster_node_id, relation="BELONGS_TO_CLUSTER", weight=0.8)

    # 2. Add high-similarity links between vectors in the same cluster (top 2 neighbors each)
    try:
        from app.store import store
        if store.faiss_index is not None and len(vectors) > 2:
            for v in vectors[:100]: # Cap to first 100 for fast density
                vid = v.get("id")
                emb = v.get("embedding")
                if emb:
                    sims = store.query_similarity(emb, top_k=3)
                    for sim in sims:
                        sim_id = sim.get("id")
                        score = sim.get("score", 0.0)
                        if sim_id and sim_id != vid and score > 0.75:
                            graph_store.add_edge(
                                source=vid,
                                target=sim_id,
                                relation="SIMILAR_TO",
                                weight=score,
                                metadata={"score": score}
                            )
    except Exception as e:
        logger.warning(f"Heuristic similarity linking skipped: {str(e)}")

    return edges


def build_knowledge_graph_from_dataset(
    mode: str = "hybrid",
    provider: str = "gemini",
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    max_llm_samples: int = 25
) -> Dict[str, Any]:
    """
    Constructs or rebuilds the in-memory knowledge graph from the active vector store.
    mode can be 'heuristic', 'llm', or 'hybrid'.
    """
    graph_store.clear()
    all_vectors = list(store.vectors.values())

    if not all_vectors:
        return {"status": "empty", "message": "No vectors in store."}

    logger.info(f"Building Knowledge Graph for {len(all_vectors)} vectors (mode={mode})...")

    # Step 1: Always build baseline metadata & structural relations
    extract_heuristic_relations(all_vectors)

    # Step 2: If LLM or Hybrid mode requested and API key available, extract semantic triples
    llm_extracted_count = 0
    if mode in ["llm", "hybrid"]:
        sample_records = all_vectors[:max_llm_samples]
        for v in sample_records:
            vid = v.get("id")
            meta = v.get("metadata", {})
            raw_text = meta.get("original_text") or meta.get("text_snippet") or v.get("label", "")
            if len(raw_text) > 15:
                triples = extract_triples_with_llm(
                    text=raw_text,
                    provider=provider,
                    model=model,
                    api_key=api_key
                )
                for t in triples:
                    subj = t["subject"]
                    rel = t["relation"]
                    obj = t["object"]
                    graph_store.add_edge(source=subj, target=obj, relation=rel, evidence=raw_text[:100])
                    # Also link the document to the subject entity
                    graph_store.add_edge(source=vid, target=subj, relation="MENTIONS", weight=0.9)
                    llm_extracted_count += 1

    # Step 3: Run Community Detection
    graph_store.detect_communities()

    summary = graph_store.get_graph_summary()
    summary["llm_triples_extracted"] = llm_extracted_count
    logger.info(f"Knowledge Graph construction complete: {summary}")
    return summary


def find_graph_entities_for_query(query: str) -> List[str]:
    """
    Identifies graph nodes and entities mentioned or relevant to the user query.
    """
    query_lower = query.lower()
    matched_nodes = []
    
    # Exact and token overlap matching
    query_tokens = set(re.findall(r'\w+', query_lower))
    
    for node_id, data in graph_store.graph.nodes(data=True):
        label = str(data.get("label", node_id)).lower()
        node_id_lower = str(node_id).lower()

        # Check full substring or token match
        if len(label) > 2 and (label in query_lower or node_id_lower in query_lower):
            matched_nodes.append(node_id)
            continue
            
        label_tokens = set(re.findall(r'\w+', label))
        if label_tokens and (label_tokens.issubset(query_tokens) or len(label_tokens.intersection(query_tokens)) >= 2):
            matched_nodes.append(node_id)

    return matched_nodes[:8]


def retrieve_graph_rag_context(
    query: str,
    top_k: int = 5,
    hops: int = 2,
    embedding_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Performs hybrid retrieval:
    1. FAISS vector similarity search for top document chunks.
    2. Entity extraction and multi-hop subgraph traversal in NetworkX.
    3. Shortest-path multi-hop relation reasoning between seed entities.
    """
    # 1. Vector Search
    vector_results = []
    try:
        from app.embeddings import generate_embeddings
        provider = store.embedding_provider or "gemini"
        model = store.embedding_model
        api_key = embedding_api_key or store.embedding_api_key

        query_vectors, _ = generate_embeddings(
            provider=provider,
            documents=[query],
            model=model,
            api_key=api_key
        )
        if query_vectors and len(query_vectors) > 0:
            vector_results = store.query_similarity(query_vectors[0], top_k=top_k)
    except Exception as e:
        logger.warning(f"Vector search during Graph RAG fallback: {str(e)}")

    # Fallback keyword match if vector search yielded empty
    if not vector_results:
        from app.chat import text_based_keyword_search
        all_vecs = list(store.vectors.values())
        vector_results = text_based_keyword_search(query, all_vecs, top_k=top_k)

    # 2. Find Seed Entities
    seed_nodes = set()
    for v in vector_results:
        seed_nodes.add(v["id"])

    query_entity_nodes = find_graph_entities_for_query(query)
    seed_nodes.update(query_entity_nodes)

    # 3. Traverse Subgraph
    seed_list = list(seed_nodes)
    subgraph = graph_store.get_subgraph(seed_nodes=seed_list, hops=hops, max_nodes=50)

    # 4. Multi-Hop Shortest Paths between query entities and top retrieved items
    paths = []
    if len(seed_list) >= 2:
        for i in range(min(3, len(seed_list))):
            for j in range(i + 1, min(4, len(seed_list))):
                p = graph_store.find_shortest_path(seed_list[i], seed_list[j])
                if p:
                    paths.append({
                        "source": seed_list[i],
                        "target": seed_list[j],
                        "steps": p
                    })

    # 5. Format Triples for Context
    triples_text = []
    for edge in subgraph.get("edges", []):
        triples_text.append(f"({edge['source']}) -[{edge['relation']}]-> ({edge['target']})")

    paths_text = []
    for path in paths:
        step_strs = [f"({s['source']}) -> [{s['relation']}] -> ({s['target']})" for s in path["steps"]]
        paths_text.append(" -> ".join(step_strs))

    return {
        "vector_results": vector_results,
        "seed_entities": seed_list,
        "subgraph": subgraph,
        "triples_text": triples_text[:30],
        "paths": paths,
        "paths_text": paths_text[:5]
    }


def generate_community_summaries(
    provider: str = "gemini",
    model: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[int, str]:
    """
    Generates high-level summaries for all communities in the graph (Microsoft GraphRAG style).
    """
    if not graph_store.communities:
        graph_store.detect_communities()

    if not LANGCHAIN_AVAILABLE or not graph_store.communities:
        return {}

    import os
    resolved_api_key = api_key or (
        os.getenv("GEMINI_API_KEY") if provider == "gemini" else os.getenv("GROQ_API_KEY")
    )
    if not resolved_api_key:
        return {}

    try:
        if provider == "groq":
            llm = ChatGroq(
                model=model or "llama-3.3-70b-versatile",
                groq_api_key=resolved_api_key,
                temperature=0.2,
                max_tokens=350
            )
        else:
            llm = ChatGoogleGenerativeAI(
                model=model or "gemini-2.5-flash",
                google_api_key=resolved_api_key,
                temperature=0.2,
                max_output_tokens=350
            )

        summaries = {}
        for comm_id, node_ids in list(graph_store.communities.items())[:8]:
            nodes_info = []
            for nid in node_ids[:15]:
                ndata = graph_store.graph.nodes.get(nid, {})
                label = ndata.get("label", nid)
                nodes_info.append(f"- {label} ({ndata.get('node_type', 'ENTITY')})")
            
            prompt = (
                f"You are a Graph Analysis Assistant. Summarize this community cluster of entities into a 2-sentence executive theme overview:\n"
                + "\n".join(nodes_info)
            )
            resp = llm.invoke([HumanMessage(content=prompt)])
            summary_txt = resp.content if hasattr(resp, "content") else str(resp)
            summaries[comm_id] = summary_txt.strip()
            graph_store.community_summaries[comm_id] = summary_txt.strip()

        return summaries
    except Exception as e:
        logger.warning(f"Community summary generation failed: {str(e)}")
        return {}
