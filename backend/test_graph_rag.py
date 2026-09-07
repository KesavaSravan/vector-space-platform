import os
import sys
import numpy as np

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.models import VectorInput
from app.store import store
from app.graph import graph_store
from app.graph_rag import (
    extract_heuristic_relations,
    retrieve_graph_rag_context,
    build_knowledge_graph_from_dataset
)

def test_graph_rag_engine():
    print("--- 1. Testing Vector & Graph Store Ingestion ---")
    store.clear()
    
    # Generate 10 test vectors
    vectors = [
        VectorInput(
            id="INC001",
            label="Payment Gateway DB Timeout",
            embedding=list(np.random.randn(64)),
            metadata={"service": "PaymentGateway", "severity": "Critical", "category": "Database", "original_text": "Payment gateway database timed out on cluster-1"}
        ),
        VectorInput(
            id="INC002",
            label="PostgreSQL High CPU",
            embedding=list(np.random.randn(64)),
            metadata={"service": "PaymentGateway", "severity": "High", "category": "Database", "original_text": "PostgreSQL instance experiencing 99% CPU load"}
        ),
        VectorInput(
            id="INC003",
            label="VPN Connection Drop",
            embedding=list(np.random.randn(64)),
            metadata={"service": "CorpVPN", "severity": "Medium", "category": "Network", "original_text": "Remote employee VPN gateway reset connection"}
        ),
        VectorInput(
            id="INC004",
            label="Auth Token Expired",
            embedding=list(np.random.randn(64)),
            metadata={"service": "AuthService", "severity": "High", "category": "Security", "original_text": "OAuth tokens failing to validate against redis session cache"}
        ),
    ]

    res = store.add_vectors(vectors)
    print("Ingested vectors:", res)
    assert res["accepted"] == 4, f"Expected 4 accepted, got {res['accepted']}"

    print("--- 2. Testing Graph Topology & Metrics ---")
    summary = graph_store.get_graph_summary()
    print("Graph Summary:", summary)
    assert summary["nodes_count"] > 0, "Graph nodes should be > 0"
    assert summary["edges_count"] > 0, "Graph edges should be > 0"

    print("--- 3. Testing Relational Traversal & Paths ---")
    # Check if INC001 and INC002 share PaymentGateway entity
    path = graph_store.find_shortest_path("INC001", "INC002")
    print("Path between INC001 and INC002:", path)
    assert path is not None, "Expected multi-hop path through shared service"

    print("--- 4. Testing Subgraph Extraction ---")
    subgraph = graph_store.get_subgraph(["INC001"], hops=2)
    print("Subgraph for INC001:", f"{len(subgraph['nodes'])} nodes, {len(subgraph['edges'])} edges")
    assert len(subgraph["nodes"]) >= 2

    print("--- 5. Testing Community Detection ---")
    communities = graph_store.detect_communities()
    print(f"Communities detected: {len(communities)} communities")
    assert len(communities) >= 1

    print("--- 6. Testing Hybrid Graph RAG Retrieval ---")
    retrieval = retrieve_graph_rag_context(query="PaymentGateway database timeout", top_k=2)
    print("Retrieved seed entities:", retrieval["seed_entities"])
    print("Retrieved triples sample:", retrieval["triples_text"][:5])
    assert len(retrieval["seed_entities"]) > 0

    print("--- 7. Testing Serialization & Deserialization ---")
    data = graph_store.to_dict()
    assert "nodes" in data and "edges" in data
    
    # Reload into graph
    graph_store.from_dict(data)
    summary_after = graph_store.get_graph_summary()
    assert summary_after["nodes_count"] == summary["nodes_count"]
    print("Reloaded graph successfully, nodes match:", summary_after["nodes_count"])

    print("\nALL GRAPH RAG BACKEND TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_graph_rag_engine()
