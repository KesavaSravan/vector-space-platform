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

  // 4. Create metadata values color mapping if colorBy starts with metadata:
  const metadataColorMap = useMemo(() => {
    const map = {};
    if (state.algo.colorBy.startsWith("metadata:")) {
      const key = state.algo.colorBy.substring(9);
      const uniqueVals = Array.from(
        new Set(state.points.map(pt => pt.metadata?.[key]).filter(Boolean))
      ).sort();
      uniqueVals.forEach((val, index) => {
        map[val] = CLUSTER_COLORS[index % CLUSTER_COLORS.length];
      });
    }
    return map;
  }, [state.points, state.algo.colorBy]);

  // 5. Determine resolved point style (LOD fallback)
  const resolvedStyle = useMemo(() => {
    if (state.pointStyle && state.pointStyle !== "auto") {
      return state.pointStyle;
    }
    const count = filteredPoints.length;
    if (count > 25000) return "points";
    if (count > 8000) return "cubes";
    if (count > 3000) return "lowpoly";
    return "spheres";
  }, [state.pointStyle, filteredPoints.length]);

  // Object templates for instanced mesh updates
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // 6. Update matrices and colors inside useLayoutEffect (before paint) for instanced mesh
  useLayoutEffect(() => {
    if (resolvedStyle === "points" || !meshRef.current) return;

    const count = filteredPoints.length;
    meshRef.current.count = count;

    filteredPoints.forEach((p, idx) => {
      // Position
      const normCoords = normalizeCoords(p.coords, transform);
      tempObject.position.set(normCoords[0], normCoords[1], normCoords[2]);

      // Scale calculations
      let size = 0.075;
      const isChatRef = state.chatReferences && state.chatReferences.includes(p.id);
      const isSelected = state.selectedIds && state.selectedIds.includes(p.id);

      if (isSelected) {
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

      // Color calculations
      let hexColor = "#8E8E93";
      if (isSelected) {
        hexColor = tokens.signal; // Selected/Lasso points are Cyan
      } else if (isChatRef) {
        hexColor = "#FF9500"; // Orange highlight for RAG references
      } else if (neighborScores[p.id] !== undefined) {
        hexColor = "#54FFF0"; // Soft cyan for neighbors
      } else if (state.algo.colorBy === "severity") {
        const sev = p.metadata?.severity || p.severity || "Low";
        hexColor = SEVERITY_COLORS[sev] || SEVERITY_COLORS.Low;
      } else if (state.algo.colorBy.startsWith("metadata:")) {
        const key = state.algo.colorBy.substring(9);
        const val = p.metadata?.[key];
        hexColor = metadataColorMap[val] || "#8E8E93";
      } else {
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
    resolvedStyle,
    state.selectedIds,
    state.hoveredId,
    state.chatReferences,
    neighborScores,
    state.algo.colorBy,
    transform,
    tempObject,
    tempColor,
    metadataColorMap
  ]);

  // 7. Calculate points attributes for optimized point cloud rendering
  const pointCloudData = useMemo(() => {
    if (resolvedStyle !== "points") return null;

    const count = filteredPoints.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colObj = new THREE.Color();

    filteredPoints.forEach((p, idx) => {
      const normCoords = normalizeCoords(p.coords, transform);
      positions[idx * 3] = normCoords[0];
      positions[idx * 3 + 1] = normCoords[1];
      positions[idx * 3 + 2] = normCoords[2];

      let hexColor = "#8E8E93";
      const isSelected = state.selectedIds && state.selectedIds.includes(p.id);
      const isChatRef = state.chatReferences && state.chatReferences.includes(p.id);

      if (isSelected) {
        hexColor = tokens.signal;
      } else if (isChatRef) {
        hexColor = "#FF9500";
      } else if (neighborScores[p.id] !== undefined) {
        hexColor = "#54FFF0";
      } else if (state.algo.colorBy === "severity") {
        const sev = p.metadata?.severity || p.severity || "Low";
        hexColor = SEVERITY_COLORS[sev] || SEVERITY_COLORS.Low;
      } else if (state.algo.colorBy.startsWith("metadata:")) {
        const key = state.algo.colorBy.substring(9);
        const val = p.metadata?.[key];
        hexColor = metadataColorMap[val] || "#8E8E93";
      } else {
        const cIdx = p.cluster === -1 ? 14 : Math.abs(p.cluster) % CLUSTER_COLORS.length;
        hexColor = CLUSTER_COLORS[cIdx];
      }

      colObj.set(hexColor);
      colors[idx * 3] = colObj.r;
      colors[idx * 3 + 1] = colObj.g;
      colors[idx * 3 + 2] = colObj.b;
    });

    return {
      positions: new THREE.Float32BufferAttribute(positions, 3),
      colors: new THREE.Float32BufferAttribute(colors, 3)
    };
  }, [filteredPoints, resolvedStyle, transform, state.selectedIds, state.chatReferences, neighborScores, state.algo.colorBy, metadataColorMap]);

  // Pointer Interaction - Instanced Mesh
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

  // Pointer Interaction - Point Cloud
  const handlePointsClick = (e) => {
    e.stopPropagation();
    const idx = e.index;
    if (idx !== undefined && filteredPoints[idx]) {
      selectVector(filteredPoints[idx].id);
    }
  };

  const handlePointsHover = (e) => {
    e.stopPropagation();
    const idx = e.index;
    if (idx !== undefined && filteredPoints[idx]) {
      setHovered(filteredPoints[idx].id);
      document.body.style.cursor = "pointer";
    }
  };

  const handlePointsLeave = () => {
    setHovered(null);
    document.body.style.cursor = "default";
  };

  // Render Point Cloud
  if (resolvedStyle === "points" && pointCloudData) {
    return (
      <points
        onClick={handlePointsClick}
        onPointerMove={handlePointsHover}
        onPointerOut={handlePointsLeave}
      >
        <bufferGeometry attach="geometry">
          <bufferAttribute attach="attributes-position" {...pointCloudData.positions} />
          <bufferAttribute attach="attributes-color" {...pointCloudData.colors} />
        </bufferGeometry>
        <pointsMaterial attach="material" size={0.3} vertexColors sizeAttenuation transparent opacity={0.8} />
      </points>
    );
  }

  // Render Instanced Mesh with selected geometry LOD
  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, 100000]} // Preallocate up to 100k
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {resolvedStyle === "cubes" ? (
        <boxGeometry args={[1, 1, 1]} />
      ) : resolvedStyle === "lowpoly" ? (
        <sphereGeometry args={[1, 6, 6]} />
      ) : (
        <sphereGeometry args={[1, 14, 14]} />
      )}
      <meshStandardMaterial roughness={0.2} metalness={0.15} />
    </instancedMesh>
  );
}
