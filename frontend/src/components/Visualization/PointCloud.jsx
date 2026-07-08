import React, { useRef, useMemo, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAppState, useAppActions } from "../../context/AppContext";
import { computeSceneTransform, normalizeCoords } from "../../utils/normalizeCoords";
import { useFilteredPoints } from "../../utils/useFilteredPoints";
import { CLUSTER_COLORS, SEVERITY_COLORS, tokens } from "../../theme";

export default function PointCloud() {
  const state = useAppState();
  const { selectVector, setHovered } = useAppActions();
  const meshRef = useRef();

  // 1. Get filtered points
  const filteredPoints = useFilteredPoints(state.points, state.filters, state.similarity);

  // 2. Compute scene transform once on full points list
  const transform = useMemo(
    () => computeSceneTransform(state.points, 12),
    [state.points]
  );

  // 3. Map neighbor ids to score for fast rendering lookup
  const neighborScores = useMemo(() => {
    const map = {};
    if (state.selectedId && state.similarity.matches) {
      state.similarity.matches.forEach((m) => {
        map[m.id] = m.score;
      });
    }
    return map;
  }, [state.selectedId, state.similarity.matches]);

  // Object templates for instanced mesh updates
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // 4. Update matrices and colors inside useLayoutEffect (before paint)
  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const count = filteredPoints.length;
    meshRef.current.count = count;

    filteredPoints.forEach((p, idx) => {
      // Position
      const normCoords = normalizeCoords(p.coords, transform);
      tempObject.position.set(normCoords[0], normCoords[1], normCoords[2]);

      // Scale (selected = large, hovered = medium, chatRef = intermediate-large, neighbor = intermediate, default = small)
      let size = 0.075;
      const isChatRef = state.chatReferences && state.chatReferences.includes(p.id);

      if (p.id === state.selectedId) {
        size = 0.20;
      } else if (p.id === state.hoveredId) {
        size = 0.14;
      } else if (isChatRef) {
        size = 0.13;
      } else if (neighborScores[p.id] !== undefined) {
        size = 0.11;
      }
      tempObject.scale.set(size, size, size);

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(idx, tempObject.matrix);

      // Color
      let hexColor = "#8E8E93";
      if (p.id === state.selectedId) {
        hexColor = tokens.signal; // selection is Cyan
      } else if (isChatRef) {
        hexColor = "#FF9500"; // Orange highlight for RAG references
      } else if (neighborScores[p.id] !== undefined) {
        hexColor = "#54FFF0"; // Soft cyan for neighbors
      } else if (state.algo.colorBy === "severity") {
        const sev = p.metadata?.severity || p.severity || "Low";
        hexColor = SEVERITY_COLORS[sev] || SEVERITY_COLORS.Low;
      } else {
        // color by cluster index (outliers are -1, mapped to index 14)
        const cIdx = p.cluster === -1 ? 14 : Math.abs(p.cluster) % CLUSTER_COLORS.length;
        hexColor = CLUSTER_COLORS[cIdx];
      }

      tempColor.set(hexColor);
      meshRef.current.setColorAt(idx, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [
    filteredPoints,
    state.selectedId,
    state.hoveredId,
    state.chatReferences,
    neighborScores,
    state.algo.colorBy,
    transform,
    tempObject,
    tempColor
  ]);

  // Pointer Interaction
  const handlePointerOver = (e) => {
    e.stopPropagation();
    const instId = e.instanceId;
    if (instId !== undefined && filteredPoints[instId]) {
      setHovered(filteredPoints[instId].id);
      document.body.style.cursor = "pointer";
    }
  };

  const handlePointerOut = (e) => {
    setHovered(null);
    document.body.style.cursor = "default";
  };

  const handleClick = (e) => {
    e.stopPropagation();
    const instId = e.instanceId;
    if (instId !== undefined && filteredPoints[instId]) {
      selectVector(filteredPoints[instId].id);
    }
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, 100000]} // Preallocate size for up to 100k
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial roughness={0.15} metalness={0.1} />
    </instancedMesh>
  );
}
