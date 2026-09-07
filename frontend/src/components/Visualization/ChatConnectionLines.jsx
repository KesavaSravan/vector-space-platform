import React, { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useAppState } from "../../context/AppContext";
import { computeSceneTransform, normalizeCoords } from "../../utils/normalizeCoords";

export default function ChatConnectionLines() {
  const state = useAppState();

  const lines = useMemo(() => {
    const { chatReferences, points } = state;

    if (!chatReferences || chatReferences.length < 2 || points.length === 0) {
      return [];
    }

    const transform = computeSceneTransform(points, 12);
    const calculatedLines = [];

    // Find and project coordinates for each reference node
    const activeCoords = [];
    chatReferences.forEach((refId) => {
      const point = points.find((p) => p.id === refId);
      if (point) {
        const normPos = normalizeCoords(point.coords, transform);
        activeCoords.push(normPos);
      }
    });

    // Create sequential line paths between consecutive references
    for (let i = 0; i < activeCoords.length - 1; i++) {
      calculatedLines.push({
        start: activeCoords[i],
        end: activeCoords[i + 1],
        opacity: 0.85
      });
    }

    return calculatedLines;
  }, [state.chatReferences, state.points]);

  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line, idx) => (
        <Line
          key={idx}
          points={[line.start, line.end]}
          color="#FF9500" // RAG Orange
          lineWidth={2.0}
          transparent
          opacity={line.opacity}
        />
      ))}
    </group>
  );
}
