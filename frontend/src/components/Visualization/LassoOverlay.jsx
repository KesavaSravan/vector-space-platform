import React, { useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useAppState, useAppActions } from "../../context/AppContext";
import { computeSceneTransform, normalizeCoords } from "../../utils/normalizeCoords";
import { useFilteredPoints } from "../../utils/useFilteredPoints";

export default function LassoOverlay() {
  const state = useAppState();
  const { setSelectedIds, setLassoMode } = useAppActions();
  const { camera, gl } = useThree();

  const [points2d, setPoints2d] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Run the filtering hook to only select from visualized points
  const filteredPoints = useFilteredPoints(state.points, state.filters, state.similarity);

  const transform = React.useMemo(
    () => computeSceneTransform(state.points, 12),
    [state.points]
  );

  useEffect(() => {
    if (!state.lassoMode) {
      setPoints2d([]);
      setIsDrawing(false);
      return;
    }

    const canvas = gl.domElement;

    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return [
        e.clientX - rect.left,
        e.clientY - rect.top
      ];
    };

    const handleMouseDown = (e) => {
      if (e.button !== 0) return; // Left click only
      setIsDrawing(true);
      const pos = getMousePos(e);
      setPoints2d([pos]);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      const pos = getMousePos(e);
      setPoints2d((prev) => [...prev, pos]);
    };

    const handleMouseUp = (e) => {
      if (!isDrawing) return;
      setIsDrawing(false);

      // Check if we drew a valid boundary
      if (points2d.length > 2) {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const tempV = new THREE.Vector3();
        const selected = [];

        filteredPoints.forEach((p) => {
          // Normalize coordinates and project
          const normCoords = normalizeCoords(p.coords, transform);
          tempV.set(normCoords[0], normCoords[1], normCoords[2]).project(camera);

          // Convert NDC to screen-space pixel coordinates
          const pxX = (tempV.x * 0.5 + 0.5) * width;
          const pxY = (-tempV.y * 0.5 + 0.5) * height;

          // Check if inside drawn polygon boundary
          if (isPointInPolygon([pxX, pxY], points2d)) {
            selected.push(p.id);
          }
        });

        if (selected.length > 0) {
          setSelectedIds(selected);
        }
      }

      setPoints2d([]);
      setLassoMode(false); // Auto toggle off after drawing finishes
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [state.lassoMode, isDrawing, points2d, filteredPoints, transform, camera, gl]);

  if (!state.lassoMode || points2d.length === 0) return null;

  const pointsStr = points2d.map(p => `${p[0]},${p[1]}`).join(" ");

  return (
    <Html
      fullscreen
      style={{
        pointerEvents: "none",
        zIndex: 10
      }}
    >
      <svg width="100%" height="100%">
        <polygon
          points={pointsStr}
          fill="rgba(0, 229, 199, 0.08)"
          stroke="#00E5C7"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
      </svg>
    </Html>
  );
}

// Ray-casting algorithm for point-in-polygon test
function isPointInPolygon(point, polygon) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
