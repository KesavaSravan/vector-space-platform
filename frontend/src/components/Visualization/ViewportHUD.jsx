import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { Gesture as LassoIcon } from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { CLUSTER_COLORS, SEVERITY_COLORS, tokens } from "../../theme";

export default function ViewportHUD() {
  const state = useAppState();
  const { setLassoMode } = useAppActions();

  const { points, algo, selectedId } = state;
  const { reductionMethod, nComponents, colorBy } = algo;

  // Determine clusters represented in the current dataset
  const uniqueClusters = React.useMemo(() => {
    const set = new Set(points.map((p) => p.cluster));
    return Array.from(set).sort((a, b) => a - b);
  }, [points]);

  // Determine dynamic metadata values represented
  const metadataLegendItems = React.useMemo(() => {
    if (!colorBy.startsWith("metadata:")) return [];
    const key = colorBy.substring(9);
    const uniqueVals = Array.from(new Set(points.map(pt => pt.metadata?.[key]).filter(Boolean))).sort();
    return uniqueVals.map((val, idx) => {
      const col = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
      return { label: String(val), color: col };
    });
  }, [points, colorBy]);

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
      {/* Top Row: Badge/Info on left, Lasso toggle on right */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
        {/* Top Left: Badge & Info */}
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

        {/* Top Right: Lasso Mode Button */}
        {points.length > 0 && (
          <Box sx={{ pointerEvents: "auto" }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => setLassoMode(!state.lassoMode)}
              startIcon={<LassoIcon />}
              sx={{
                backdropFilter: "blur(4px)",
                backgroundColor: state.lassoMode ? tokens.signal : "rgba(124, 92, 255, 0.8)",
                color: state.lassoMode ? tokens.bg : tokens.textPrimary,
                borderRadius: 2,
                fontWeight: 600,
                border: state.lassoMode ? `1px solid ${tokens.signal}` : `1px solid ${tokens.accent}80`,
                "&:hover": {
                  backgroundColor: state.lassoMode ? "#00C7AD" : "#6747E6"
                }
              }}
            >
              {state.lassoMode ? "Drawing Lasso..." : "Lasso Select"}
            </Button>
          </Box>
        )}
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
            minWidth: 160,
            maxWidth: 240,
            pointerEvents: "auto",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            gap: 1
          }}
        >
          <Typography variant="caption" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
            {colorBy === "severity"
              ? "Severity Legends"
              : colorBy.startsWith("metadata:")
              ? `Legend: ${colorBy.substring(9)}`
              : "Clusters Legend"}
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
          ) : colorBy.startsWith("metadata:") ? (
            // Metadata Legend
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {metadataLegendItems.slice(0, 5).map((item) => (
                <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: item.color }} />
                  <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.72rem" }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
              {metadataLegendItems.length === 0 && (
                <Typography variant="caption" sx={{ color: tokens.textMuted, fontSize: "0.68rem", fontStyle: "italic" }}>
                  No metadata values found.
                </Typography>
              )}
              {metadataLegendItems.length > 5 && (
                <Typography variant="caption" sx={{ color: tokens.textMuted, fontSize: "0.68rem", pl: 2, fontStyle: "italic" }}>
                  + {metadataLegendItems.length - 5} more values
                </Typography>
              )}
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
          {state.lassoMode ? (
            <Typography variant="caption" sx={{ color: tokens.signal, fontSize: "0.72rem", fontWeight: 700, animation: "pulse 1.5s infinite" }}>
              🖱️ Left-Click & Drag on Canvas to draw lasso path!
            </Typography>
          ) : (
            <>
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
            </>
          )}
        </Box>

      </Box>
    </Box>
  );
}
