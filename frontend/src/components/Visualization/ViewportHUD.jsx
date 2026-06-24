import React from "react";
import { Box, Typography } from "@mui/material";
import { useAppState } from "../../context/AppContext";
import { CLUSTER_COLORS, SEVERITY_COLORS, tokens } from "../../theme";

export default function ViewportHUD() {
  const state = useAppState();

  const { points, algo, selectedId } = state;
  const { reductionMethod, nComponents, colorBy } = algo;

  // Determine clusters represented in the current dataset
  const uniqueClusters = React.useMemo(() => {
    const set = new Set(points.map((p) => p.cluster));
    return Array.from(set).sort((a, b) => a - b);
  }, [points]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none", // HUD doesn't block orbit control clicks!
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        p: 2
      }}
    >
      {/* Top Left: Badge & Info */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Box
          sx={{
            backgroundColor: "rgba(17, 20, 28, 0.85)",
            border: `1px solid ${tokens.border}`,
            borderRadius: 1,
            px: 1.5,
            py: 0.75,
            width: "fit-content",
            pointerEvents: "auto",
            backdropFilter: "blur(4px)"
          }}
        >
          <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal, fontWeight: 700, display: "block" }}>
            PROJECTION METHOD: {reductionMethod.toUpperCase()} ({nComponents}D)
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.72rem" }}>
            Dataset contains {points.length} nodes
          </Typography>
        </Box>
      </Box>

      {/* Bottom Row */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        
        {/* Bottom Left: Color Legend */}
        <Box
          sx={{
            backgroundColor: "rgba(17, 20, 28, 0.85)",
            border: `1px solid ${tokens.border}`,
            borderRadius: 1.5,
            p: 1.5,
            maxWidth: 240,
            pointerEvents: "auto",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            gap: 1
          }}
        >
          <Typography variant="caption" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
            {colorBy === "severity" ? "Severity Legends" : "Clusters Legend"}
          </Typography>

          {colorBy === "severity" ? (
            // Severity Legend
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {Object.entries(SEVERITY_COLORS).map(([key, col]) => (
                <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: col }} />
                  <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.72rem" }}>
                    {key}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            // Cluster Legend (compact up to 5 clusters, plus others)
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {uniqueClusters.slice(0, 5).map((clusterId) => {
                const cIdx = clusterId === -1 ? 14 : Math.abs(clusterId) % CLUSTER_COLORS.length;
                const col = CLUSTER_COLORS[cIdx];
                return (
                  <Box key={clusterId} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: col }} />
                    <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.72rem" }}>
                      {clusterId === -1 ? "Outliers (-1)" : `Cluster ${clusterId}`}
                    </Typography>
                  </Box>
                );
              })}
              {uniqueClusters.length > 5 && (
                <Typography variant="caption" sx={{ color: tokens.textMuted, fontSize: "0.68rem", pl: 2, fontStyle: "italic" }}>
                  + {uniqueClusters.length - 5} more clusters
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {/* Bottom Right: Control Hints */}
        <Box
          sx={{
            backgroundColor: "rgba(17, 20, 28, 0.85)",
            border: `1px solid ${tokens.border}`,
            borderRadius: 1,
            px: 1.5,
            py: 0.75,
            pointerEvents: "auto",
            backdropFilter: "blur(4px)"
          }}
        >
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.7rem", lineHeight: 1.4, display: "block" }}>
            🖱️ <strong>Left Click:</strong> Select Node / Close Selection
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.7rem", lineHeight: 1.4, display: "block" }}>
            🔄 <strong>Left Drag:</strong> Rotate Camera
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.7rem", lineHeight: 1.4, display: "block" }}>
            ↕️ <strong>Scroll:</strong> Zoom In/Out
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.7rem", lineHeight: 1.4, display: "block" }}>
            ↔️ <strong>Right Drag:</strong> Pan Scene
          </Typography>
        </Box>

      </Box>
    </Box>
  );
}
