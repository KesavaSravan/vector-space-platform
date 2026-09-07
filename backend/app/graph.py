import logging
from typing import List, Dict, Any, Optional, Set, Tuple
import networkx as nx

logger = logging.getLogger("graph")

class KnowledgeGraph:
    """
    Embedded In-Memory Knowledge Graph built on NetworkX MultiDiGraph.
    Provides graph persistence, entity-relation storage, multi-hop traversal,
    community detection, and JSON export/import.
    """
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.communities: Dict[int, List[str]] = {}
        self.community_summaries: Dict[int, str] = {}

    def clear(self):
        """Resets the graph and all associated community structures."""
        self.graph.clear()
        self.communities.clear()
        self.community_summaries.clear()
        logger.info("KnowledgeGraph: Cleared in-memory graph.")

    def add_node(
        self,
        node_id: str,
        label: str,
        node_type: str = "DOCUMENT",
        vector_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Adds or updates a node in the knowledge graph.
        node_type can be: DOCUMENT, ENTITY, CONCEPT, SERVICE, METRIC, CLUSTER, etc.
        """
        node_id = str(node_id).strip()
        if not node_id:
            return ""

        meta = metadata or {}
        self.graph.add_node(
            node_id,
            label=label or node_id,
            node_type=node_type,
            vector_id=vector_id or (node_id if node_type == "DOCUMENT" else None),
            metadata=meta
        )
        return node_id

    def add_edge(
        self,
        source: str,
        target: str,
        relation: str,
        weight: float = 1.0,
        evidence: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Adds a directed relation between source and target nodes.
        Creates missing nodes with default type 'ENTITY' if they don't already exist.
        """
        source = str(source).strip()
        target = str(target).strip()
        relation = str(relation).strip().upper().replace(" ", "_")

        if not source or not target or not relation or source == target:
            return

        if not self.graph.has_node(source):
            self.add_node(node_id=source, label=source, node_type="ENTITY")
        if not self.graph.has_node(target):
            self.add_node(node_id=target, label=target, node_type="ENTITY")

        meta = metadata or {}
        if evidence:
            meta["evidence"] = evidence

        self.graph.add_edge(
            source,
            target,
            key=relation,
            relation=relation,
            weight=float(weight),
            metadata=meta
        )

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Returns node attributes if it exists."""
        if self.graph.has_node(node_id):
            attrs = dict(self.graph.nodes[node_id])
            attrs["id"] = node_id
            return attrs
        return None

    def get_neighbors(self, node_id: str, hops: int = 1) -> Set[str]:
        """
        Returns all nodes reachable within `hops` steps in either direction.
        """
        if not self.graph.has_node(node_id):
            return set()
        
        visited = {node_id}
        current_layer = {node_id}

        undirected = self.graph.to_undirected(as_view=True)
        for _ in range(hops):
            next_layer = set()
            for n in current_layer:
                neighbors = set(undirected.neighbors(n))
                next_layer.update(neighbors - visited)
            visited.update(next_layer)
            current_layer = next_layer
            if not current_layer:
                break

        return visited

    def find_shortest_path(self, source: str, target: str) -> Optional[List[Dict[str, Any]]]:
        """
        Finds the shortest relational path between two entities.
        Returns a list of step dicts: [{'source': ..., 'relation': ..., 'target': ...}]
        """
        if not self.graph.has_node(source) or not self.graph.has_node(target):
            return None

        try:
            # Search undirected for connectivity, then reconstruct directed edges
            undirected = self.graph.to_undirected(as_view=True)
            node_path = nx.shortest_path(undirected, source=source, target=target)
            
            steps = []
            for i in range(len(node_path) - 1):
                u, v = node_path[i], node_path[i + 1]
                # Check directed edge u -> v or v -> u
                edge_data = None
                rel_type = "RELATED_TO"
                if self.graph.has_edge(u, v):
                    edge_dict = self.graph.get_edge_data(u, v)
                    rel_type = list(edge_dict.keys())[0] if edge_dict else "RELATED_TO"
                    steps.append({"source": u, "relation": rel_type, "target": v})
                elif self.graph.has_edge(v, u):
                    edge_dict = self.graph.get_edge_data(v, u)
                    rel_type = list(edge_dict.keys())[0] if edge_dict else "RELATED_TO"
                    steps.append({"source": v, "relation": rel_type, "target": u, "is_reverse": True})
                else:
                    steps.append({"source": u, "relation": "CONNECTED_TO", "target": v})
            return steps
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

    def get_subgraph(self, seed_nodes: List[str], hops: int = 1, max_nodes: int = 60) -> Dict[str, Any]:
        """
        Extracts a localized subgraph around seed_nodes.
        Returns nodes, edges, and statistics.
        """
        subgraph_nodes = set()
        for seed in seed_nodes:
            subgraph_nodes.update(self.get_neighbors(seed, hops=hops))

        # If too large, prioritize seed nodes and high-degree neighbors
        if len(subgraph_nodes) > max_nodes:
            prioritized = set(seed_nodes)
            other_nodes = list(subgraph_nodes - prioritized)
            other_nodes.sort(key=lambda n: self.graph.degree(n), reverse=True)
            subgraph_nodes = prioritized.union(set(other_nodes[: max_nodes - len(prioritized)]))

        sub_g = self.graph.subgraph(subgraph_nodes)

        nodes_list = []
        for n, data in sub_g.nodes(data=True):
            nodes_list.append({
                "id": n,
                "label": data.get("label", n),
                "type": data.get("node_type", "ENTITY"),
                "vector_id": data.get("vector_id"),
                "community": data.get("community", 0),
                "degree": self.graph.degree(n),
                "metadata": data.get("metadata", {})
            })

        edges_list = []
        for u, v, key, data in sub_g.edges(keys=True, data=True):
            edges_list.append({
                "source": u,
                "target": v,
                "relation": data.get("relation", str(key)),
                "weight": data.get("weight", 1.0),
                "metadata": data.get("metadata", {})
            })

        return {
            "nodes": nodes_list,
            "edges": edges_list,
            "total_nodes": len(nodes_list),
            "total_edges": len(edges_list)
        }

    def detect_communities(self) -> Dict[int, List[str]]:
        """
        Detects communities/clusters in the knowledge graph using modularity optimization.
        Assigns community IDs to nodes and caches communities.
        """
        if self.graph.number_of_nodes() < 2:
            self.communities = {0: list(self.graph.nodes())}
            for n in self.graph.nodes():
                self.graph.nodes[n]["community"] = 0
            return self.communities

        try:
            undirected = self.graph.to_undirected()
            # Use greedy modularity community detection
            communities_gen = nx.community.greedy_modularity_communities(undirected)
            self.communities = {}
            for idx, comm in enumerate(communities_gen):
                comm_list = list(comm)
                self.communities[idx] = comm_list
                for node in comm_list:
                    if self.graph.has_node(node):
                        self.graph.nodes[node]["community"] = idx
            logger.info(f"KnowledgeGraph: Detected {len(self.communities)} communities.")
        except Exception as e:
            logger.warning(f"Community detection fallback: {str(e)}")
            self.communities = {0: list(self.graph.nodes())}
            for n in self.graph.nodes():
                self.graph.nodes[n]["community"] = 0

        return self.communities

    def get_graph_summary(self) -> Dict[str, Any]:
        """
        Calculates high-level topological metrics of the knowledge graph.
        """
        n_nodes = self.graph.number_of_nodes()
        n_edges = self.graph.number_of_edges()

        if n_nodes == 0:
            return {
                "nodes_count": 0,
                "edges_count": 0,
                "density": 0.0,
                "relation_types": {},
                "top_entities": [],
                "communities_count": 0
            }

        # Relation distribution
        relation_counts: Dict[str, int] = {}
        for _, _, _, data in self.graph.edges(keys=True, data=True):
            rel = data.get("relation", "RELATED_TO")
            relation_counts[rel] = relation_counts.get(rel, 0) + 1

        # Central entities (Top hubs)
        degrees = dict(self.graph.degree())
        sorted_nodes = sorted(degrees.items(), key=lambda x: x[1], reverse=True)[:10]
        top_entities = [
            {
                "id": node_id,
                "label": self.graph.nodes[node_id].get("label", node_id),
                "type": self.graph.nodes[node_id].get("node_type", "ENTITY"),
                "connections": deg
            }
            for node_id, deg in sorted_nodes
        ]

        density = nx.density(self.graph) if n_nodes > 1 else 0.0

        return {
            "nodes_count": n_nodes,
            "edges_count": n_edges,
            "density": round(float(density), 4),
            "relation_types": relation_counts,
            "top_entities": top_entities,
            "communities_count": len(self.communities)
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serializes the graph to a JSON-compatible dictionary."""
        nodes = []
        for n, data in self.graph.nodes(data=True):
            nodes.append({
                "id": n,
                "label": data.get("label", n),
                "node_type": data.get("node_type", "ENTITY"),
                "vector_id": data.get("vector_id"),
                "community": data.get("community", 0),
                "metadata": data.get("metadata", {})
            })

        edges = []
        for u, v, key, data in self.graph.edges(keys=True, data=True):
            edges.append({
                "source": u,
                "target": v,
                "relation": data.get("relation", str(key)),
                "weight": data.get("weight", 1.0),
                "metadata": data.get("metadata", {})
            })

        return {
            "nodes": nodes,
            "edges": edges,
            "communities": {str(k): v for k, v in self.communities.items()},
            "community_summaries": {str(k): v for k, v in self.community_summaries.items()}
        }

    def from_dict(self, data: Dict[str, Any]):
        """Deserializes and loads graph state from a dictionary."""
        self.clear()
        if not data:
            return

        nodes = data.get("nodes", [])
        for n in nodes:
            self.add_node(
                node_id=n.get("id"),
                label=n.get("label", n.get("id")),
                node_type=n.get("node_type", "ENTITY"),
                vector_id=n.get("vector_id"),
                metadata=n.get("metadata", {})
            )
            if "community" in n:
                self.graph.nodes[n["id"]]["community"] = n["community"]

        edges = data.get("edges", [])
        for e in edges:
            self.add_edge(
                source=e.get("source"),
                target=e.get("target"),
                relation=e.get("relation", "RELATED_TO"),
                weight=e.get("weight", 1.0),
                metadata=e.get("metadata", {})
            )

        if "communities" in data:
            self.communities = {int(k): v for k, v in data["communities"].items()}
        else:
            self.detect_communities()

        if "community_summaries" in data:
            self.community_summaries = {int(k): v for k, v in data["community_summaries"].items()}

        logger.info(f"KnowledgeGraph: Loaded {len(nodes)} nodes and {len(edges)} edges.")

# Global Singleton Knowledge Graph instance
graph_store = KnowledgeGraph()
