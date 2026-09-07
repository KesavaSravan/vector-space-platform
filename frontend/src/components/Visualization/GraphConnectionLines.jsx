import React, { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useAppState } from "../../context/AppContext";
import { computeSceneTransform, normalizeCoords } from "../../utils/normalizeCoords";

// Color mappings for different relation types
const RELATION_COLORS = {
  SIMILAR_TO: "#38bdf8", // Sky Blue
  HAS_SERVICE: "#a855f7", // Purple
  HAS_CATEGORY: "#f59e0b", // Amber
  HAS_SEVERITY: "#ef4444", // Red
  BELONGS_TO_CLUSTER: "#10b981", // Emerald
  MENTIONS: "#ec4899", // Pink
  DEPENDS_ON: "#e11d48", // Rose
  CAUSES: "#f97316", // Orange
  DEFAULT: "#94a3b8" // Slate
};

export default function GraphConnectionLines() {
  const state = useAppState();
  const { graphData, showGraphLines, highlightedGraphPath, points } = state;

  const { regularEdges, highlightedEdges } = useMemo(() => {
    if (!showGraphLines || !points || points.length === 0) {
      return { regularEdges: [], highlightedEdges: [] };
    }

    const transform = computeSceneTransform(points, 12);
    
    // Quick map for point coords
    const coordMap = new Map();
    points.forEach((p) => {
      coordMap.set(p.id, normalizeCoords(p.coords, transform));
    });

    const reg = [];
    const high = [];

    // 1. Process standard graph edges
    if (graphData && graphData.edges) {
      // Map entity nodes that share vector_ids or direct point IDs
      graphData.edges.forEach((edge, idx) => {
        const startPos = coordMap.get(edge.source);
        const endPos = coordMap.get(edge.target);

        if (startPos && endPos && edge.source !== edge.target) {
          const rel = (edge.relation || "").toUpperCase();
          const color = RELATION_COLORS[rel] || RELATION_COLORS.DEFAULT;
          reg.push({
            id: `edge-${idx}`,
            start: startPos,
            end: endPos,
            color,
            relation: edge.relation,
            lineWidth: 1.0,
            opacity: 0.35
          });
        }
      });
    }

    // 2. Process Highlighted Multi-Hop Paths from Graph RAG
    if (highlightedGraphPath && Array.isArray(highlightedGraphPath)) {
      highlightedGraphPath.forEach((pathObj, pIdx) => {
        if (pathObj.steps && Array.isArray(pathObj.steps)) {
          pathObj.steps.forEach((step, sIdx) => {
            const startPos = coordMap.get(step.source);
            const endPos = coordMap.get(step.target);
            if (startPos && endPos) {
              high.push({
                id: `high-${pIdx}-${sIdx}`,
                start: startPos,
                end: endPos,
                color: "#22c55e", // Bright Neon Green for active reasoning hop
                lineWidth: 3.5,
                opacity: 0.95
              });
            }
          });
        }
      });
    }

    return { regularEdges: reg.slice(0, 300), highlightedEdges: high };
  }, [graphData, showGraphLines, highlightedGraphPath, points]);

  if (regularEdges.length === 0 && highlightedEdges.length === 0) return null;

  return (
    <group>
      {/* Background Knowledge Graph Topology Lines */}
      {regularEdges.map((edge) => (
        <Line
          key={edge.id}
          points={[edge.start, edge.end]}
          color={edge.color}
          lineWidth={edge.lineWidth}
          transparent
          opacity={edge.opacity}
        />
      ))}

      {/* Foreground Glowing Multi-Hop Traversal Lines */}
      {highlightedEdges.map((edge) => (
        <Line
          key={edge.id}
          points={[edge.start, edge.end]}
          color={edge.color}
          lineWidth={edge.lineWidth}
          transparent
          opacity={edge.opacity}
        />
      ))}
    </group>
  );
}
