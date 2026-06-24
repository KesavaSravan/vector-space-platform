import React, { useState, useEffect } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import {
  InfoOutlined as InfoIcon,
  CompareArrows as SimilarityIcon,
  BarChart as AnalyticsIcon,
  Timeline as TimelineIcon
} from "@mui/icons-material";
import { useAppState } from "../../context/AppContext";
import VectorDetails from "../Details/VectorDetails";
import SimilarityResults from "../Details/SimilarityResults";
import AnalyticsDashboard from "../Analytics/AnalyticsDashboard";
import AlertTimeline from "../Analytics/AlertTimeline";
import { tokens } from "../../theme";

export default function RightPanel() {
  const state = useAppState();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // If we change modes and Timeline tab was active, fallback to Details (0)
  useEffect(() => {
    if (state.mode !== "alert" && tabValue === 3) {
      setTabValue(0);
    }
  }, [state.mode, tabValue]);

  // If a point is selected, we might want to auto-focus on either Details or Similarity tab. Let's keep it manual or adapt.
  useEffect(() => {
    if (state.selectedId && tabValue === 2) {
      // If statistics was active, focus on Details
      setTabValue(0);
    }
  }, [state.selectedId]);

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
          backgroundColor: tokens.surface2
        }}
      >
        <Tab icon={<InfoIcon sx={{ fontSize: 16 }} />} label="Details" />
        <Tab icon={<SimilarityIcon sx={{ fontSize: 16 }} />} label="Matches" />
        <Tab icon={<AnalyticsIcon sx={{ fontSize: 16 }} />} label="Stats" />
        {state.mode === "alert" && (
          <Tab icon={<TimelineIcon sx={{ fontSize: 16 }} />} label="Timeline" />
        )}
      </Tabs>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {tabValue === 0 && (
          <Box className="scrollable-panel" sx={{ p: 2 }}>
            <VectorDetails />
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
        {tabValue === 3 && state.mode === "alert" && (
          <Box className="scrollable-panel" sx={{ p: 2 }}>
            <AlertTimeline />
          </Box>
        )}
      </Box>
    </Box>
  );
}
