import React, { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { tokens, CLUSTER_COLORS } from "../../theme";

export default function HeroCanvas() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 450);

    const dpr = window.devicePixelRatio || 1;

    // Create vector nodes array
    const numPoints = 55;
    const points = Array.from({ length: numPoints }, (_, i) => ({
      x: (Math.random() - 0.5) * width * 0.9,
      y: (Math.random() - 0.5) * height * 0.9,
      z: Math.random() * 400 + 100, // Depth
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
      clusterId: i % 4,
      size: Math.random() * 2.5 + 2
    }));

    // Cluster centroids
    const centroids = [
      { x: -160 * dpr, y: -90 * dpr, color: tokens.signal, label: "SRE Alerts (Cluster 0)" },
      { x: 160 * dpr, y: -70 * dpr, color: tokens.accent, label: "Auth Errors (Cluster 1)" },
      { x: -100 * dpr, y: 110 * dpr, color: "#FF2D55", label: "Database Timeout (Cluster 2)" },
      { x: 120 * dpr, y: 100 * dpr, color: "#FFCC00", label: "Network Spikes (Cluster 3)" }
    ];

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - rect.width / 2) * dpr;
      const my = (e.clientY - rect.top - rect.height / 2) * dpr;
      mouseRef.current.targetX = mx;
      mouseRef.current.targetY = my;
    };

    window.addEventListener("mousemove", handleMouseMove);

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const centerX = width / 2 + mouseRef.current.x * 0.04;
      const centerY = height / 2 + mouseRef.current.y * 0.04;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Draw Grid Matrix Background
      ctx.strokeStyle = "rgba(35, 40, 56, 0.35)";
      ctx.lineWidth = 1 * dpr;
      const gridSize = 40 * dpr;
      for (let x = -width; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -height);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -height; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-width, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Centroid Pulsating Rings & Hulls
      centroids.forEach((c, idx) => {
        // Pulsating Sonar Ring
        const ringR = ((frame * 1.2 + idx * 35) % 80) * dpr;
        ctx.beginPath();
        ctx.arc(c.x, c.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1 * dpr;
        ctx.globalAlpha = Math.max(0, 1 - ringR / (80 * dpr));
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Cluster Hull Outer Circle
        ctx.beginPath();
        ctx.arc(c.x, c.y, 55 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.08;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.2 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Core Centroid Dot
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 10 * dpr;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Update and Draw Points
      points.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;

        // Bounce within bounds
        const boundX = width * 0.42;
        const boundY = height * 0.42;
        if (pt.x > boundX || pt.x < -boundX) pt.vx *= -1;
        if (pt.y > boundY || pt.y < -boundY) pt.vy *= -1;

        // Perspective scale factor based on depth
        const scale = 300 / (300 + pt.z);
        const px = pt.x * scale;
        const py = pt.y * scale;

        // Draw Point
        ctx.beginPath();
        ctx.arc(px, py, pt.size * scale * dpr, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 6 * dpr;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Connecting Laser Lines between points in same cluster or close proximity
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const p1 = points[i];
          const p2 = points[j];

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 85 * dpr && p1.clusterId === p2.clusterId) {
            const alpha = (1 - dist / (85 * dpr)) * 0.45;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p1.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: { xs: 340, md: 440 },
        borderRadius: 4,
        overflow: "hidden",
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.border}`,
        boxShadow: `0 20px 50px rgba(0,0,0,0.6)`
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block"
        }}
      />

      {/* Sci-Fi Overlay Badges */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          backgroundColor: "rgba(17, 20, 28, 0.85)",
          backdropFilter: "blur(8px)",
          border: `1px solid rgba(0, 229, 199, 0.4)`,
          display: "flex",
          alignItems: "center",
          gap: 1
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: tokens.signal,
            boxShadow: `0 0 8px ${tokens.signal}`
          }}
        />
        <span
          className="font-mono"
          style={{ fontSize: "11px", color: tokens.signal, fontWeight: 700 }}
        >
          REALTIME 3D VECTOR SPACE CANVAS
        </span>
      </Box>

      {/* Floating Info Tag Bottom Right */}
      <Box
        className="floating-card-1"
        sx={{
          position: "absolute",
          bottom: 16,
          right: 16,
          px: 2,
          py: 1,
          borderRadius: 3,
          backgroundColor: "rgba(17, 20, 28, 0.9)",
          backdropFilter: "blur(12px)",
          border: `1px solid rgba(124, 92, 255, 0.5)`,
          boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
          display: "flex",
          flexDirection: "column",
          gap: 0.2
        }}
      >
        <span className="font-mono" style={{ fontSize: "10px", color: tokens.textMuted }}>
          PROJECTION ENGINE
        </span>
        <span className="font-display" style={{ fontSize: "12px", color: tokens.textPrimary, fontWeight: 700 }}>
          PCA / t-SNE / UMAP + HDBSCAN
        </span>
      </Box>

      {/* Floating Info Tag Bottom Left */}
      <Box
        className="floating-card-2"
        sx={{
          position: "absolute",
          bottom: 16,
          left: 16,
          px: 2,
          py: 1,
          borderRadius: 3,
          backgroundColor: "rgba(17, 20, 28, 0.9)",
          backdropFilter: "blur(12px)",
          border: `1px solid rgba(0, 229, 199, 0.5)`,
          boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
          display: "flex",
          flexDirection: "column",
          gap: 0.2
        }}
      >
        <span className="font-mono" style={{ fontSize: "10px", color: tokens.signal }}>
          RETRIEVAL INDEX
        </span>
        <span className="font-display" style={{ fontSize: "12px", color: tokens.textPrimary, fontWeight: 700 }}>
          FAISS Cosine Similarity &lt; 1ms
        </span>
      </Box>
    </Box>
  );
}
