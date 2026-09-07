import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Chip, LinearProgress } from "@mui/material";
import {
  AutoAwesome as EmbedIcon,
  Compress as ReduceIcon,
  BubbleChart as ClusterIcon,
  CheckCircle as CheckIcon,
  Memory as MemoryIcon
} from "@mui/icons-material";
import { useAppState } from "../../context/AppContext";
import { tokens, CLUSTER_COLORS } from "../../theme";

export default function ProcessingOverlay() {
  const state = useAppState();
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Track completed steps during a single multi-step pipeline run
  const [completedSteps, setCompletedSteps] = useState({
    embed: false,
    reduce: false,
    cluster: false
  });

  const isEmbedding = state.loading.embed || state.loading.upload;
  const isReducing = state.loading.reduce;
  const isClustering = state.loading.cluster;

  const isActive = isEmbedding || isReducing || isClustering;

  // Determine current active stage
  let activeStage = null;
  if (isEmbedding) activeStage = "embed";
  else if (isReducing) activeStage = "reduce";
  else if (isClustering) activeStage = "cluster";

  // Reset completed steps when all loading stops
  useEffect(() => {
    if (!isActive) {
      setCompletedSteps({ embed: false, reduce: false, cluster: false });
    }
  }, [isActive]);

  // Mark steps as completed when moving to subsequent steps
  useEffect(() => {
    if (isReducing) {
      setCompletedSteps((prev) => ({ ...prev, embed: true }));
    }
    if (isClustering) {
      setCompletedSteps((prev) => ({ ...prev, embed: true, reduce: true }));
    }
  }, [isReducing, isClustering]);

  // Canvas 2D Animation Engine
  useEffect(() => {
    if (!isActive || !canvasRef.current || !activeStage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 500);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 220);

    let frame = 0;

    // Canvas animation objects state
    // Stage 1: Embedding Nodes & Text Stream
    const textNodes = [
      { text: "Incident #5821 - Auth Failure", y: 40, speed: 1.8, x: -120 },
      { text: "High CPU Spike - US-East-1", y: 80, speed: 2.2, x: -180 },
      { text: "Database connection pool empty", y: 120, speed: 1.5, x: -90 },
      { text: "Vector [0.042, -0.891, 0.312...]", y: 160, speed: 2.0, x: -220 }
    ];

    // Stage 2: Dimensionality Reduction Nodes
    const reducePoints = Array.from({ length: 42 }, (_, i) => ({
      // High-dim starting positions
      startAngle: (i / 42) * Math.PI * 2,
      radius: 60 + Math.sin(i) * 30,
      // Target reduced coords (3D projection grid)
      tx: (Math.cos((i / 42) * Math.PI * 2) * 120) + (Math.sin(i * 3) * 20),
      ty: (Math.sin((i / 42) * Math.PI * 2) * 60) + (Math.cos(i * 2) * 20),
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length]
    }));

    // Stage 3: Clustering Points & Centroids
    const clusterCenters = [
      { x: -110, y: -20, color: tokens.signal, name: "Cluster 0: Infrastructure" },
      { x: 110, y: -30, color: tokens.accent, name: "Cluster 1: Auth & Access" },
      { x: 0, y: 55, color: "#FF2D55", name: "Cluster 2: Database Latency" }
    ];

    const clusterPoints = Array.from({ length: 48 }, (_, i) => {
      const targetCluster = clusterCenters[i % clusterCenters.length];
      return {
        clusterIdx: i % clusterCenters.length,
        // offset from centroid
        ox: (Math.random() - 0.5) * 60,
        oy: (Math.random() - 0.5) * 50,
        pulseOffset: Math.random() * Math.PI * 2
      };
    });

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      const dpr = window.devicePixelRatio || 1;
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw Background Grid Lines (Sci-Fi Matrix look)
      ctx.strokeStyle = "rgba(35, 40, 56, 0.4)";
      ctx.lineWidth = 1 * dpr;
      const gridSize = 30 * dpr;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // ==========================================
      // STAGE 1: EMBEDDINGS ANIMATION
      // ==========================================
      if (activeStage === "embed") {
        // Central Gateway Ring
        const gatewayX = centerX;
        const gatewayY = centerY;
        const ringRadius = 45 * dpr;

        // Draw Gateway Outer Glow & Ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(gatewayX, gatewayY, ringRadius + Math.sin(frame * 0.08) * 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 229, 199, 0.6)";
        ctx.lineWidth = 3 * dpr;
        ctx.shadowColor = tokens.signal;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();

        // Inner Rotating Scanner Teeth
        ctx.save();
        ctx.translate(gatewayX, gatewayY);
        ctx.rotate(frame * 0.03);
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (ringRadius - 10 * dpr), Math.sin(a) * (ringRadius - 10 * dpr));
          ctx.lineTo(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius);
          ctx.strokeStyle = tokens.accent;
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        }
        ctx.restore();

        // Text Streams Gliding Left to Right
        textNodes.forEach((node) => {
          node.x += node.speed * dpr;
          if (node.x * dpr > gatewayX - 30 * dpr && node.x * dpr < gatewayX + 30 * dpr) {
            // Passing through neural gateway -> emit matrix particles
            for (let p = 0; p < 3; p++) {
              const particleAngle = Math.random() * Math.PI * 2;
              const particleDist = Math.random() * ringRadius;
              ctx.fillStyle = tokens.signal;
              ctx.beginPath();
              ctx.arc(
                gatewayX + Math.cos(particleAngle) * particleDist,
                gatewayY + Math.sin(particleAngle) * particleDist,
                2 * dpr,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }

          if (node.x * dpr > width + 100) {
            node.x = -200;
          }

          // Draw Text String
          const drawX = node.x * dpr;
          const drawY = node.y * dpr;

          if (drawX < gatewayX - 20 * dpr) {
            // Incoming Raw Text
            ctx.font = `${11 * dpr}px "JetBrains Mono", monospace`;
            ctx.fillStyle = "rgba(231, 233, 240, 0.7)";
            ctx.fillText(node.text.length > 22 ? node.text.substring(0, 20) + "..." : node.text, drawX, drawY);
          } else {
            // Transformed Vector Representation
            ctx.font = `${10 * dpr}px "JetBrains Mono", monospace`;
            ctx.fillStyle = tokens.signal;
            ctx.shadowColor = tokens.signal;
            ctx.shadowBlur = 8;
            ctx.fillText(`Vector[${(Math.sin(frame * 0.1 + node.y) * 0.9).toFixed(3)}, ...]`, drawX, drawY);
            ctx.shadowBlur = 0;
          }
        });

        // Formula Overlay
        ctx.font = `${11 * dpr}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = "rgba(140, 147, 168, 0.8)";
        ctx.textAlign = "center";
        ctx.fillText("Embedding Model: E = f_transformer(Text) ∈ ℝ¹⁵³⁶", centerX, height - 15 * dpr);
      }

      // ==========================================
      // STAGE 2: DIMENSIONALITY REDUCTION ANIMATION
      // ==========================================
      else if (activeStage === "reduce") {
        const method = (state.algo.reductionMethod || "PCA").toUpperCase();
        const dims = state.algo.nComponents || 3;

        // Draw 3D Coordinate Axis Grid
        ctx.save();
        ctx.translate(centerX, centerY);

        const rot = frame * 0.02;

        // X, Y, Z Axis Rays
        const axes = [
          { dx: Math.cos(rot) * 110 * dpr, dy: Math.sin(rot) * 35 * dpr, color: "#FF3B30", label: "PC1" },
          { dx: Math.cos(rot + 2.1) * 110 * dpr, dy: Math.sin(rot + 2.1) * 35 * dpr, color: tokens.signal, label: "PC2" },
          { dx: 0, dy: -80 * dpr, color: tokens.accent, label: "PC3" }
        ];

        axes.forEach((axis) => {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(axis.dx, axis.dy);
          ctx.strokeStyle = axis.color;
          ctx.lineWidth = 1.5 * dpr;
          ctx.setLineDash([4 * dpr, 4 * dpr]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = `bold ${10 * dpr}px "Space Grotesk", sans-serif`;
          ctx.fillStyle = axis.color;
          ctx.fillText(axis.label, axis.dx * 1.1, axis.dy * 1.1);
        });

        // Draw Contracting Multi-Dimensional Points
        const progress = (Math.sin(frame * 0.03) + 1) / 2; // 0 to 1 smooth oscillation

        reducePoints.forEach((pt) => {
          // Interpolate between high-dim radius and converged projection coordinates
          const curRadius = pt.radius * (1 - progress * 0.4);
          const angle = pt.startAngle + rot * 0.5;

          const hx = Math.cos(angle) * curRadius * dpr;
          const hy = Math.sin(angle) * (curRadius * 0.5) * dpr;

          const px = hx * (1 - progress) + pt.tx * progress * dpr;
          const py = hy * (1 - progress) + pt.ty * progress * dpr;

          // Projection ray line to target plane
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(px, py);
          ctx.strokeStyle = "rgba(124, 92, 255, 0.25)";
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();

          // Point node
          ctx.beginPath();
          ctx.arc(px, py, (3 + progress * 2) * dpr, 0, Math.PI * 2);
          ctx.fillStyle = pt.color;
          ctx.shadowColor = pt.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        ctx.restore();

        // Formula Overlay Footer
        ctx.font = `${11 * dpr}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = "rgba(140, 147, 168, 0.8)";
        ctx.textAlign = "center";
        ctx.fillText(`Algorithm: ${method} (${dims}D) — Projecting High-Dim Manifold`, centerX, height - 15 * dpr);
      }

      // ==========================================
      // STAGE 3: CLUSTERING ANIMATION
      // ==========================================
      else if (activeStage === "cluster") {
        const clusterMethod = (state.algo.clusterMethod || "HDBSCAN").toUpperCase();

        ctx.save();
        ctx.translate(centerX, centerY);

        // Draw Cluster Centroids & Translucent Hulls
        clusterCenters.forEach((center, idx) => {
          const cx = center.x * dpr;
          const cy = center.y * dpr;

          // Pulse expansion ring (density radius search)
          const pulseRadius = ((frame * 1.5 + idx * 30) % 70) * dpr;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = center.color;
          ctx.lineWidth = 1 * dpr;
          ctx.globalAlpha = Math.max(0, 1 - pulseRadius / (70 * dpr));
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // Hull translucent bubble around cluster
          ctx.beginPath();
          ctx.arc(cx, cy, 45 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = center.color;
          ctx.globalAlpha = 0.12;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = center.color;
          ctx.lineWidth = 1.5 * dpr;
          ctx.setLineDash([3 * dpr, 3 * dpr]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Centroid beacon core
          ctx.beginPath();
          ctx.arc(cx, cy, 6 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = center.color;
          ctx.shadowColor = center.color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        // Draw Data Points Pulled Toward Centroids
        clusterPoints.forEach((pt) => {
          const c = clusterCenters[pt.clusterIdx];
          const cx = c.x * dpr;
          const cy = c.y * dpr;

          const px = cx + pt.ox * dpr + Math.sin(frame * 0.05 + pt.pulseOffset) * 6 * dpr;
          const py = cy + pt.oy * dpr + Math.cos(frame * 0.05 + pt.pulseOffset) * 6 * dpr;

          // Gravitational connecting line
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(px, py);
          ctx.strokeStyle = c.color;
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // Cluster Data Point
          ctx.beginPath();
          ctx.arc(px, py, 3.5 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = c.color;
          ctx.fill();
        });

        ctx.restore();

        // Footer Formula Info
        ctx.font = `${11 * dpr}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = "rgba(140, 147, 168, 0.8)";
        ctx.textAlign = "center";
        ctx.fillText(`Density Clustering: ${clusterMethod} — Grouping Vector Neighborhoods`, centerX, height - 15 * dpr);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, activeStage, state.algo.reductionMethod, state.algo.nComponents, state.algo.clusterMethod]);

  if (!isActive) return null;

  // Header Chip Label & Stage Titles
  let stageTitle = "";
  let stageSubtitle = "";
  if (isEmbedding) {
    stageTitle = "Creating High-Dimensional Embeddings";
    stageSubtitle = "Generating vector representations from text tokens via API Transformer...";
  } else if (isReducing) {
    stageTitle = `Dimensionality Reduction (${(state.algo.reductionMethod || "PCA").toUpperCase()})`;
    stageSubtitle = `Projecting high-dimensional vectors to ${state.algo.nComponents || 3}D coordinate space...`;
  } else if (isClustering) {
    stageTitle = `Topological Clustering (${(state.algo.clusterMethod || "HDBSCAN").toUpperCase()})`;
    stageSubtitle = "Grouping vector embeddings by spatial cosine density & assigning cluster IDs...";
  }

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(10, 12, 18, 0.78)",
        backdropFilter: "blur(10px)",
        animation: "fadeIn 0.3s ease-out"
      }}
    >
      {/* Central Futuristic Glass HUD Modal */}
      <Box
        sx={{
          width: 540,
          maxWidth: "92vw",
          backgroundColor: tokens.surface,
          borderRadius: 4,
          border: `1px solid rgba(0, 229, 199, 0.35)`,
          boxShadow: `0 0 50px rgba(0, 229, 199, 0.15), 0 20px 60px rgba(0,0,0,0.85)`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Top Header Bar */}
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            backgroundColor: tokens.surface2,
            borderBottom: `1px solid ${tokens.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: tokens.signal,
                boxShadow: `0 0 10px ${tokens.signal}`,
                animation: "pulse 1.2s infinite ease-in-out"
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontFamily: tokens.fontDisplay,
                fontWeight: 700,
                color: tokens.textPrimary,
                letterSpacing: 1.5,
                textTransform: "uppercase"
              }}
            >
              VECTOR PLATFORM PROCESSING ENGINE
            </Typography>
          </Box>

          <Chip
            icon={<MemoryIcon sx={{ fontSize: "14px !important", color: `${tokens.signal} !important` }} />}
            label="PIPELINE ACTIVE"
            size="small"
            sx={{
              backgroundColor: "rgba(0, 229, 199, 0.1)",
              border: `1px solid rgba(0, 229, 199, 0.3)`,
              color: tokens.signal,
              fontSize: "10px",
              fontWeight: 700,
              fontFamily: tokens.fontMono
            }}
          />
        </Box>

        {/* 3-Step Pipeline Stepper */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 1,
            p: 1.5,
            backgroundColor: tokens.bg,
            borderBottom: `1px solid ${tokens.border}`
          }}
        >
          {/* Step 1: Embeddings */}
          <Box
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: 2,
              border: `1px solid ${
                isEmbedding
                  ? tokens.signal
                  : completedSteps.embed
                  ? "rgba(52, 199, 89, 0.5)"
                  : tokens.border
              }`,
              backgroundColor: isEmbedding
                ? "rgba(0, 229, 199, 0.12)"
                : completedSteps.embed
                ? "rgba(52, 199, 89, 0.08)"
                : tokens.surface,
              display: "flex",
              alignItems: "center",
              gap: 1,
              transition: "all 0.3s ease"
            }}
          >
            {completedSteps.embed && !isEmbedding ? (
              <CheckIcon sx={{ fontSize: 16, color: "#34C759" }} />
            ) : (
              <EmbedIcon sx={{ fontSize: 16, color: isEmbedding ? tokens.signal : tokens.textMuted }} />
            )}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontWeight: 700,
                  fontSize: "11px",
                  color: isEmbedding ? tokens.signal : completedSteps.embed ? "#34C759" : tokens.textSecondary
                }}
              >
                1. Embeddings
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "9px", color: tokens.textMuted }}>
                {isEmbedding ? "Generating..." : completedSteps.embed ? "Completed" : "Pending"}
              </Typography>
            </Box>
          </Box>

          {/* Step 2: Reduction */}
          <Box
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: 2,
              border: `1px solid ${
                isReducing
                  ? tokens.signal
                  : completedSteps.reduce
                  ? "rgba(52, 199, 89, 0.5)"
                  : tokens.border
              }`,
              backgroundColor: isReducing
                ? "rgba(0, 229, 199, 0.12)"
                : completedSteps.reduce
                ? "rgba(52, 199, 89, 0.08)"
                : tokens.surface,
              display: "flex",
              alignItems: "center",
              gap: 1,
              transition: "all 0.3s ease"
            }}
          >
            {completedSteps.reduce && !isReducing ? (
              <CheckIcon sx={{ fontSize: 16, color: "#34C759" }} />
            ) : (
              <ReduceIcon sx={{ fontSize: 16, color: isReducing ? tokens.signal : tokens.textMuted }} />
            )}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontWeight: 700,
                  fontSize: "11px",
                  color: isReducing ? tokens.signal : completedSteps.reduce ? "#34C759" : tokens.textSecondary
                }}
              >
                2. Reduction
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "9px", color: tokens.textMuted }}>
                {isReducing ? "Computing..." : completedSteps.reduce ? "Completed" : "Pending"}
              </Typography>
            </Box>
          </Box>

          {/* Step 3: Clustering */}
          <Box
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: 2,
              border: `1px solid ${
                isClustering
                  ? tokens.signal
                  : completedSteps.cluster
                  ? "rgba(52, 199, 89, 0.5)"
                  : tokens.border
              }`,
              backgroundColor: isClustering
                ? "rgba(0, 229, 199, 0.12)"
                : completedSteps.cluster
                ? "rgba(52, 199, 89, 0.08)"
                : tokens.surface,
              display: "flex",
              alignItems: "center",
              gap: 1,
              transition: "all 0.3s ease"
            }}
          >
            {completedSteps.cluster && !isClustering ? (
              <CheckIcon sx={{ fontSize: 16, color: "#34C759" }} />
            ) : (
              <ClusterIcon sx={{ fontSize: 16, color: isClustering ? tokens.signal : tokens.textMuted }} />
            )}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontWeight: 700,
                  fontSize: "11px",
                  color: isClustering ? tokens.signal : completedSteps.cluster ? "#34C759" : tokens.textSecondary
                }}
              >
                3. Clustering
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "9px", color: tokens.textMuted }}>
                {isClustering ? "Partitioning..." : completedSteps.cluster ? "Completed" : "Pending"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Center Stage Animation Canvas */}
        <Box sx={{ position: "relative", width: "100%", height: 210, backgroundColor: "#0A0C12" }}>
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              display: "block"
            }}
          />
        </Box>

        {/* Active Stage Details & Progress Bar */}
        <Box sx={{ p: 2.5, backgroundColor: tokens.surface, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: tokens.textPrimary, fontWeight: 700 }}>
                {stageTitle}
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                {stageSubtitle}
              </Typography>
            </Box>

            <Chip
              label={`${state.totalVectors || state.points.length || 0} Vectors`}
              size="small"
              sx={{
                backgroundColor: tokens.surface2,
                color: tokens.textPrimary,
                fontSize: "10px",
                fontFamily: tokens.fontMono
              }}
            />
          </Box>

          {/* Animated Linear Progress */}
          <LinearProgress
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: tokens.border,
              "& .MuiLinearProgress-bar": {
                background: `linear-gradient(90deg, ${tokens.signal} 0%, ${tokens.accent} 50%, #FF2D55 100%)`
              }
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
