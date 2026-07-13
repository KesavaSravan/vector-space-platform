import React, { useState, useEffect } from "react";
import { Box, Tabs, Tab, Tooltip, Divider, Typography, IconButton } from "@mui/material";
import {
  InfoOutlined as InfoIcon,
  CompareArrows as SimilarityIcon,
  BarChart as AnalyticsIcon,
  Timeline as TimelineIcon,
  ChatOutlined as ChatIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from "@mui/icons-material";
import { useAppState } from "../../context/AppContext";
import VectorDetails from "../Details/VectorDetails";
import BulkDetailsPanel from "../Details/BulkDetailsPanel";
import SimilarityResults from "../Details/SimilarityResults";
import AnalyticsDashboard from "../Analytics/AnalyticsDashboard";
import AlertTimeline from "../Analytics/AlertTimeline";
import AIChatPanel from "../Details/AIChatPanel";
import { tokens } from "../../theme";

export default function RightPanel() {
  const state = useAppState();
  const [tabValue, setTabValue] = useState(0);
  const [qualityExpanded, setQualityExpanded] = useState(true);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };



  // If a point is selected, we might want to auto-focus on either Details or Similarity tab. Let's keep it manual or adapt.
  useEffect(() => {
    const hasSelection = state.selectedId || (state.selectedIds && state.selectedIds.length > 0);
    if (hasSelection && tabValue === 2) {
      // If statistics was active, focus on Details
      setTabValue(0);
    }
  }, [state.selectedId, state.selectedIds]);

  return (
    <Box
      sx={{
        width: 360,
        height: "100%",
        borderLeft: `1px solid ${tokens.border}`,
        backgroundColor: tokens.surface,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      {/* Tabs list */}
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          backgroundColor: tokens.surface2,
          minHeight: 40,
          "& .MuiTabs-flexContainer": {
            flexWrap: "nowrap"
          },
          "& .MuiTab-root": {
            minWidth: 0,
            px: 0.5,
            py: 0.75,
            fontSize: "0.72rem",
            textTransform: "none",
            fontWeight: 600,
            minHeight: 40,
            flexDirection: "row",
            gap: 0.5,
            "& .MuiTab-iconWrapper": {
              margin: "0 !important",
              fontSize: 14
            },
            "& .MuiSvgIcon-root": {
              fontSize: 14,
              margin: "0 !important"
            }
          }
        }}
      >
        <Tab icon={<InfoIcon sx={{ fontSize: 16 }} />} label="Details" />
        <Tab icon={<SimilarityIcon sx={{ fontSize: 16 }} />} label="Matches" />
        <Tab icon={<AnalyticsIcon sx={{ fontSize: 16 }} />} label="Stats" />
        <Tab icon={<ChatIcon sx={{ fontSize: 16 }} />} label="Chat" />
        {/* Removed alert timeline tab */}
      </Tabs>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {tabValue === 0 && (
          <Box className="scrollable-panel" sx={{ p: 2 }}>
            {/* 3D Visualization Quality Card */}
            {state.visualizationQuality && (
              <Box
                sx={{
                  backgroundColor: tokens.surface2,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 1.5,
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                  mb: 2.5
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal, fontWeight: 700 }}>
                    3D VISUALIZATION QUALITY
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setQualityExpanded(!qualityExpanded)}
                    sx={{ color: tokens.textSecondary, p: 0.25 }}
                  >
                    {qualityExpanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </Box>
                
                {qualityExpanded && (
                  <>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      {/* Method */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}>
                          Method
                        </Typography>
                        <Typography variant="caption" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
                          {state.visualizationQuality.method?.toUpperCase()}
                        </Typography>
                      </Box>
                      
                      {/* Explained Variance (only for PCA) */}
                      {state.visualizationQuality.method === "pca" ? (
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}>
                              Explained Variance
                            </Typography>
                            <Tooltip title="How much of the original embedding variance is represented by the three PCA dimensions. Available only for PCA." arrow placement="left">
                              <InfoIcon sx={{ fontSize: 13, color: tokens.textMuted, cursor: "help" }} />
                            </Tooltip>
                          </Box>
                          <Typography variant="caption" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
                            {state.visualizationQuality.explained_variance !== null && state.visualizationQuality.explained_variance !== undefined
                              ? `${state.visualizationQuality.explained_variance.toFixed(2)}%`
                              : "N/A"}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}>
                              Explained Variance
                            </Typography>
                            <Tooltip title="How much of the original embedding variance is represented by the three PCA dimensions. Available only for PCA." arrow placement="left">
                              <InfoIcon sx={{ fontSize: 13, color: tokens.textMuted, cursor: "help" }} />
                            </Tooltip>
                          </Box>
                          <Typography variant="caption" className="font-mono" sx={{ color: tokens.textMuted, fontWeight: 600 }}>
                            N/A
                          </Typography>
                        </Box>
                      )}
                      
                      {/* Neighbour Preservation */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}>
                            Neighbour Preservation
                          </Typography>
                          <Tooltip title="How many nearest-neighbour relationships from the original embedding space remain similar in the 3D visualization." arrow placement="left">
                            <InfoIcon sx={{ fontSize: 13, color: tokens.textMuted, cursor: "help" }} />
                          </Tooltip>
                        </Box>
                        <Typography variant="caption" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
                          {state.visualizationQuality.neighbor_preservation !== null && state.visualizationQuality.neighbor_preservation !== undefined
                            ? `${state.visualizationQuality.neighbor_preservation.toFixed(2)}%`
                            : "N/A"}
                        </Typography>
                      </Box>

                      {/* Distance Correlation */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}>
                            Distance Correlation
                          </Typography>
                          <Tooltip title="How well relative distance ordering between vectors is preserved after dimensionality reduction." arrow placement="left">
                            <InfoIcon sx={{ fontSize: 13, color: tokens.textMuted, cursor: "help" }} />
                          </Tooltip>
                        </Box>
                        <Typography variant="caption" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
                          {state.visualizationQuality.distance_correlation !== null && state.visualizationQuality.distance_correlation !== undefined
                            ? state.visualizationQuality.distance_correlation.toFixed(2)
                            : "N/A"}
                        </Typography>
                      </Box>

                      {/* Trustworthiness */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}>
                            Trustworthiness
                          </Typography>
                          <Tooltip title="Measures whether points shown as nearby in the 3D visualization are genuinely nearby in the original embedding space." arrow placement="left">
                            <InfoIcon sx={{ fontSize: 13, color: tokens.textMuted, cursor: "help" }} />
                          </Tooltip>
                        </Box>
                        <Typography variant="caption" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
                          {state.visualizationQuality.trustworthiness !== null && state.visualizationQuality.trustworthiness !== undefined
                            ? state.visualizationQuality.trustworthiness.toFixed(3)
                            : "N/A"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ borderTop: `1px solid ${tokens.border}`, pt: 1.25, display: "flex", flexDirection: "column", gap: 0.75 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 600, fontSize: "0.75rem" }}>
                            Quality Score
                          </Typography>
                          <Tooltip title="An estimated score of how faithfully the 3D visualization represents important structural properties of the original embedding space." arrow placement="left">
                            <InfoIcon sx={{ fontSize: 13, color: tokens.textMuted, cursor: "help" }} />
                          </Tooltip>
                        </Box>
                        <Typography variant="caption" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 700, fontSize: "0.85rem" }}>
                          {state.visualizationQuality.quality_score !== null && state.visualizationQuality.quality_score !== undefined
                            ? `${state.visualizationQuality.quality_score.toFixed(1)} / 100`
                            : "N/A"}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 600, fontSize: "0.75rem" }}>
                            Quality
                          </Typography>
                          <Tooltip title="This score estimates how faithfully the 3D visualization represents the structure of the original high-dimensional embedding space." arrow placement="left">
                            <InfoIcon sx={{ fontSize: 13, color: tokens.textMuted, cursor: "help" }} />
                          </Tooltip>
                        </Box>
                        {(() => {
                          const label = state.visualizationQuality.quality || "FAIR";
                          let color = "#ff9800";
                          if (label === "EXCELLENT") color = "#00C7AD";
                          else if (label === "GOOD") color = "#7C5CFF";
                          else if (label === "POOR") color = "#FF3B30";
                          return (
                            <Typography variant="caption" className="font-mono" sx={{ color, fontWeight: 700, fontSize: "0.85rem" }}>
                              {label}
                            </Typography>
                          );
                        })()}
                      </Box>
                    </Box>

                    <Typography variant="caption" sx={{ color: tokens.textMuted, fontSize: "0.62rem", lineHeight: 1.3 }}>
                      * 3D dimensionality reduction is used only for visualization. Semantic search and vector similarity calculations always use the original high-dimensional embeddings.
                    </Typography>
                  </>
                )}
              </Box>
            )}

            {state.visualizationQuality && <Divider sx={{ mb: 2.5 }} />}

            {state.selectedIds && state.selectedIds.length > 1 ? (
              <BulkDetailsPanel />
            ) : (
              <VectorDetails />
            )}
          </Box>
        )}
        {tabValue === 1 && (
          <Box className="scrollable-panel" sx={{ p: 2 }}>
            <SimilarityResults />
          </Box>
        )}
        {tabValue === 2 && (
          <Box className="scrollable-panel" sx={{ p: 2 }}>
            <AnalyticsDashboard />
          </Box>
        )}
        {tabValue === 3 && (
          <Box sx={{ p: 2, height: "100%" }}>
            <AIChatPanel />
          </Box>
        )}
        {/* Removed alert timeline panel */}
      </Box>
    </Box>
  );
}

