import React from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  LinearProgress,
  Chip
} from "@mui/material";
import { CompareArrows as CompareIcon } from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { CLUSTER_COLORS, tokens } from "../../theme";

export default function SimilarityResults() {
  const state = useAppState();
  const { selectVector } = useAppActions();

  const { selectedId, similarity, loading } = state;
  const { matches } = similarity;

  if (!selectedId) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "80%",
          gap: 2,
          p: 2,
          textAlign: "center"
        }}
      >
        <CompareIcon sx={{ fontSize: 48, color: tokens.textMuted }} />
        <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
          No Vector Selected. Select a point in the 3D viewport to inspect its top-K similar neighbors.
        </Typography>
      </Box>
    );
  }

  if (loading.similarity) {
    return (
      <Box sx={{ width: "100%", mt: 2 }}>
        <Typography variant="caption" sx={{ color: tokens.signal, mb: 1, display: "block" }}>
          Querying similarity index...
        </Typography>
        <LinearProgress color="secondary" />
      </Box>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
          No similar items returned.
        </Typography>
      </Box>
    );
  }

  // Find neighbor details in points array to determine their cluster and color
  const pointsMap = {};
  state.points.forEach((p) => {
    pointsMap[p.id] = p;
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Title */}
      <Box sx={{ borderBottom: `1px solid ${tokens.border}`, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: tokens.textPrimary, fontWeight: 700 }}>
          Top Similar Neighbors ({state.algo.metric === "cosine" ? "Cosine Similarity" : "Euclidean Dist"})
        </Typography>
        <Typography variant="caption" sx={{ color: tokens.textMuted }}>
          Click any neighbor node to re-center similarity search.
        </Typography>
      </Box>

      {/* Neighbors List */}
      <List sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 0 }}>
        {matches.map((match) => {
          const matchedPoint = pointsMap[match.id] || {};
          const cluster = matchedPoint.cluster !== undefined ? matchedPoint.cluster : 0;
          const severity = matchedPoint.metadata?.severity || matchedPoint.severity || "Low";

          // Calculate score percentage
          // Cosine similarity ranges from -1.0 to 1.0, but alert space values are usually positive. Let's map appropriately.
          // Euclidean similarity is returned in 1 / (1 + dist) format, range 0.0 to 1.0
          const scorePercent = Math.max(0, Math.min(100, match.score * 100));

          // Get color
          const cIdx = cluster === -1 ? 14 : Math.abs(cluster) % CLUSTER_COLORS.length;
          const barColor = CLUSTER_COLORS[cIdx];

          return (
            <ListItemButton
              key={match.id}
              onClick={() => selectVector(match.id)}
              sx={{
                flexDirection: "column",
                alignItems: "stretch",
                backgroundColor: tokens.surface2,
                border: `1px solid ${tokens.border}`,
                borderRadius: 2,
                p: 1.5,
                "&:hover": {
                  backgroundColor: tokens.surface3,
                  borderColor: tokens.signal
                }
              }}
            >
              {/* Header inside row */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", mb: 0.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.textPrimary }}>
                    {match.label}
                  </Typography>
                  <Typography variant="caption" className="font-mono" sx={{ color: tokens.textSecondary }}>
                    {match.id}
                  </Typography>
                </Box>
                <Typography variant="body2" className="font-mono" sx={{ color: tokens.signal, fontWeight: 700 }}>
                  {scorePercent.toFixed(1)}%
                </Typography>
              </Box>

              {/* Score Bar */}
              <Box sx={{ width: "100%", mt: 1, mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={scorePercent}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: tokens.bg,
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: barColor,
                      borderRadius: 3
                    }
                  }}
                />
              </Box>

              {/* Footer labels inside row */}
              <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                <Chip
                  label={severity}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    backgroundColor: tokens.bg,
                    color: tokens.textSecondary
                  }}
                />
                <Chip
                  label={cluster === -1 ? "Outlier" : `Cluster ${cluster}`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    backgroundColor: tokens.bg,
                    color: tokens.textSecondary
                  }}
                />
                {match.metadata?.source && (
                  <Typography variant="caption" sx={{ color: tokens.textMuted, fontSize: "0.68rem", alignSelf: "center", ml: "auto" }}>
                    Source: {match.metadata.source}
                  </Typography>
                )}
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
