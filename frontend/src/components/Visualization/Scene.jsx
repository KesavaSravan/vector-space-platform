import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Box } from "@mui/material";
import PointCloud from "./PointCloud";
import ConnectionLines from "./ConnectionLines";
import AxesGrid from "./AxesGrid";
import ViewportHUD from "./ViewportHUD";
import HoverTooltip from "./HoverTooltip";
import EmptyState from "./EmptyState";
import { useAppState, useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function Scene() {
  const state = useAppState();
  const { selectVector } = useAppActions();

  const handlePointerMissed = (e) => {
    // If the click is a left click, deselect the currently active vector
    if (e.button === 0) {
      selectVector(null);
    }
  };

  const pointsCount = state.points.length;

  return (
    <Box
      sx={{
        flex: 1,
        height: "100%",
        position: "relative",
        backgroundColor: tokens.bg,
        outline: "none"
      }}
    >
      {/* 1. Empty State Overlay */}
      {pointsCount === 0 && <EmptyState />}

      {/* 2. HUD Overlay (Legend, count, control clues) */}
      {pointsCount > 0 && <ViewportHUD />}

      {/* 3. HTML Tooltip follows mouse */}
      {pointsCount > 0 && <HoverTooltip />}

      {/* 4. Canvas */}
      {pointsCount > 0 && (
        <Canvas
          camera={{ position: [0, 0, 15], fov: 60 }}
          onPointerMissed={handlePointerMissed}
          gl={{ antialias: true }}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          {/* Ambient light for general visibility */}
          <ambientLight intensity={0.4} />

          {/* Directional light to give spheres depth/dimensionality */}
          <directionalLight position={[10, 10, 10]} intensity={0.8} />
          <directionalLight position={[-10, -10, -10]} intensity={0.2} />

          {/* Grid & Coordinate system */}
          <AxesGrid />

          {/* Instanced mesh representation of all data points */}
          <Suspense fallback={null}>
            <PointCloud />
          </Suspense>

          {/* 3D lines linking selection to similarity neighbors */}
          <ConnectionLines />

          {/* Orbit controls */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={50}
            makeDefault
          />
        </Canvas>
      )}
    </Box>
  );
}
