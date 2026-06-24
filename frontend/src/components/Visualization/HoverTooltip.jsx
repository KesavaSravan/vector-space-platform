import React, { useState, useEffect } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { useAppState } from "../../context/AppContext";
import { SEVERITY_COLORS, CLUSTER_COLORS, tokens } from "../../theme";

export default function HoverTooltip() {
  const state = useAppState();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const { hoveredId, points } = state;
  if (!hoveredId) return null;

  const point = points.find((p) => p.id === hoveredId);
  if (!point) return null;

  const severity = point.metadata?.severity || point.severity || "Low";
  const source = point.metadata?.source || "Unknown";
  const clusterColor = CLUSTER_COLORS[point.cluster === -1 ? 14 : Math.abs(point.cluster) % CLUSTER_COLORS.length];
  const severityColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Low;

  return (
    <Box
      className="glass-panel"
      sx={{
        position: "fixed",
        left: mousePos.x + 16,
        top: mousePos.y + 16,
        zIndex: 9999,
        pointerEvents: "none",
        p: 1.5,
        borderRadius: 2,
        maxWidth: 240,
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        gap: 0.75
      }}
    >
      {/* Title / Label */}
      <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
        {point.label}
      </Typography>

      {/* ID (Monospace) */}
      <Typography variant="caption" className="font-mono" sx={{ color: tokens.textSecondary }}>
        {point.id}
      </Typography>

      {/* Chips Row */}
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
        {/* Severity Chip */}
        <Chip
          label={severity}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.65rem",
            backgroundColor: `${severityColor}20`,
            color: severityColor,
            border: `1px solid ${severityColor}40`,
            fontWeight: 600
          }}
        />

        {/* Cluster Chip */}
        <Chip
          label={point.cluster === -1 ? "Outlier" : `Cluster ${point.cluster}`}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.65rem",
            backgroundColor: `${clusterColor}20`,
            color: clusterColor,
            border: `1px solid ${clusterColor}40`,
            fontWeight: 600
          }}
        />
      </Box>

      {/* Source detail */}
      <Typography variant="caption" sx={{ color: tokens.textMuted, fontSize: "0.68rem" }}>
        Source: {source}
      </Typography>
    </Box>
  );
}
