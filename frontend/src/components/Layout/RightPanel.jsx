import React, { useState, useEffect } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import {
  InfoOutlined as InfoIcon,
  CompareArrows as SimilarityIcon,
  BarChart as AnalyticsIcon,
  Timeline as TimelineIcon,
  ChatOutlined as ChatIcon
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

