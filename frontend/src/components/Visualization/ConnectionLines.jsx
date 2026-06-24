import React, { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useAppState } from "../../context/AppContext";
import { computeSceneTransform, normalizeCoords } from "../../utils/normalizeCoords";

export default function ConnectionLines() {
  const state = useAppState();

  const lines = useMemo(() => {
    const { selectedId, points, similarity } = state;
    const { matches } = similarity;

    if (!selectedId || !matches || matches.length === 0 || points.length === 0) {
      return [];
    }

    const selectedPoint = points.find((p) => p.id === selectedId);
    if (!selectedPoint) return [];

    const transform = computeSceneTransform(points, 12);
    const startPos = normalizeCoords(selectedPoint.coords, transform);

    const calculatedLines = [];

    matches.forEach((m) => {
      const targetPoint = points.find((p) => p.id === m.id);
      if (!targetPoint) return;

      const endPos = normalizeCoords(targetPoint.coords, transform);
      
      // Calculate opacity proportional to similarity score (e.g. cosine score range 0.0 - 1.0)
      // Cap minimum opacity at 0.15 for visibility
      const opacity = Math.max(0.15, Math.min(0.9, m.score));

      calculatedLines.push({
        start: startPos,
        end: endPos,
        opacity
      });
    });

    return calculatedLines;
  }, [state.selectedId, state.points, state.similarity.matches]);

  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line, idx) => (
        <Line
          key={idx}
          points={[line.start, line.end]}
          color="#00E5C7" // Signal Cyan
          lineWidth={1.5}
          transparent
          opacity={line.opacity}
        />
      ))}
    </group>
  );
}
