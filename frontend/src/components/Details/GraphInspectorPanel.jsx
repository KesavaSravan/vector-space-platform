import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Switch,
  FormControlLabel,
  Grid
} from "@mui/material";
import {
  Hub as HubIcon,
  Refresh as RefreshIcon,
  AccountTree as GraphIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  AutoAwesome as SparkleIcon,
  Layers as LayersIcon,
  Polyline as PolylineIcon
} from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function GraphInspectorPanel() {
  const state = useAppState();
  const {
    fetchGraphData,
    buildGraph,
    toggleShowGraphLines,
    selectVector,
    highlightGraphPath
  } = useAppActions();

  const { graphData, graphSummary, graphLoading, showGraphLines, points } = state;
  const [searchTerm, setSearchTerm] = useState("");
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (!graphData && points.length > 0) {
      fetchGraphData();
    }
  }, [points.length]);

  const handleBuildGraph = async (mode) => {
    setExtracting(true);
    try {
      await buildGraph({ mode, max_llm_samples: 25 });
    } finally {
      setExtracting(false);
    }
  };

  const filteredEntities = (graphSummary?.top_entities || []).filter((e) =>
    e.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 2, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HubIcon sx={{ color: tokens.accent, fontSize: 24 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
            Embedded Knowledge Graph
          </Typography>
        </Box>
        <Tooltip title="Refresh Graph Data">
          <IconButton size="small" onClick={fetchGraphData} disabled={graphLoading}>
            <RefreshIcon fontSize="small" sx={{ color: tokens.textSecondary }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 3D Edge Visibility Toggle */}
      <Paper
        sx={{
          p: 1.5,
          mb: 2,
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PolylineIcon sx={{ color: tokens.accent, fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.textPrimary }}>
            3D Relational Edges
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showGraphLines}
              onChange={toggleShowGraphLines}
              color="primary"
            />
          }
          label=""
          sx={{ m: 0 }}
        />
      </Paper>

      {/* Topological Metrics Grid */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Paper
            sx={{
              p: 1.5,
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 2,
              textAlign: "center"
            }}
          >
            <Typography variant="caption" sx={{ color: tokens.textSecondary, textTransform: "uppercase" }}>
              Total Nodes
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: tokens.accent }}>
              {graphSummary?.nodes_count || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper
            sx={{
              p: 1.5,
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 2,
              textAlign: "center"
            }}
          >
            <Typography variant="caption" sx={{ color: tokens.textSecondary, textTransform: "uppercase" }}>
              Relations / Edges
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#10b981" }}>
              {graphSummary?.edges_count || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper
            sx={{
              p: 1.5,
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 2,
              textAlign: "center"
            }}
          >
            <Typography variant="caption" sx={{ color: tokens.textSecondary, textTransform: "uppercase" }}>
              Communities
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#f59e0b" }}>
              {graphSummary?.communities_count || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper
            sx={{
              p: 1.5,
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 2,
              textAlign: "center"
            }}
          >
            <Typography variant="caption" sx={{ color: tokens.textSecondary, textTransform: "uppercase" }}>
              Graph Density
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#a855f7" }}>
              {graphSummary?.density || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Extraction Actions */}
      <Paper
        sx={{
          p: 1.5,
          mb: 2,
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: 2
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textSecondary, mb: 1, display: "block" }}>
          KNOWLEDGE GRAPH EXTRACTION
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            fullWidth
            startIcon={extracting ? <CircularProgress size={16} color="inherit" /> : <SparkleIcon fontSize="small" />}
            onClick={() => handleBuildGraph("hybrid")}
            disabled={extracting || points.length === 0}
            sx={{
              backgroundColor: tokens.accent,
              color: "#000",
              fontWeight: 700,
              fontSize: "0.75rem",
              textTransform: "none"
            }}
          >
            {extracting ? "Extracting..." : "Hybrid AI Extract"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<GraphIcon fontSize="small" />}
            onClick={() => handleBuildGraph("heuristic")}
            disabled={extracting || points.length === 0}
            sx={{
              borderColor: tokens.border,
              color: tokens.textPrimary,
              fontWeight: 600,
              fontSize: "0.75rem",
              textTransform: "none"
            }}
          >
            Fast Structural
          </Button>
        </Box>
      </Paper>

      {/* Relational Breakdown */}
      {graphSummary?.relation_types && Object.keys(graphSummary.relation_types).length > 0 && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: 2
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textSecondary, mb: 1, display: "block" }}>
            RELATION TYPE DISTRIBUTION
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {Object.entries(graphSummary.relation_types).map(([rel, count]) => (
              <Chip
                key={rel}
                label={`${rel} (${count})`}
                size="small"
                sx={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: tokens.textPrimary,
                  fontSize: "0.7rem",
                  border: `1px solid ${tokens.border}`
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Top Hub Entities */}
      <Paper
        sx={{
          p: 1.5,
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: 2
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textSecondary }}>
            CENTRAL ENTITIES & HUBS
          </Typography>
        </Box>

        <TextField
          size="small"
          placeholder="Filter entities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          sx={{
            mb: 1.5,
            "& .MuiOutlinedInput-root": {
              fontSize: "0.8rem",
              backgroundColor: tokens.bg,
              color: tokens.textPrimary
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: tokens.textSecondary }} />
              </InputAdornment>
            )
          }}
        />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filteredEntities.map((ent) => (
            <Box
              key={ent.id}
              onClick={() => {
                if (ent.type === "DOCUMENT") {
                  selectVector(ent.id);
                }
              }}
              sx={{
                p: 1,
                borderRadius: 1.5,
                backgroundColor: tokens.bg,
                border: `1px solid ${tokens.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: ent.type === "DOCUMENT" ? "pointer" : "default",
                "&:hover": {
                  borderColor: tokens.accent
                }
              }}
            >
              <Box sx={{ overflow: "hidden", pr: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.textPrimary, noWrap: true }}>
                  {ent.label}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: "0.7rem" }}>
                  {ent.id}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Chip
                  label={ent.type}
                  size="small"
                  sx={{
                    fontSize: "0.65rem",
                    height: 20,
                    backgroundColor: ent.type === "DOCUMENT" ? "rgba(56, 189, 248, 0.15)" : "rgba(168, 85, 247, 0.15)",
                    color: ent.type === "DOCUMENT" ? "#38bdf8" : "#c084fc"
                  }}
                />
                <Chip
                  label={`${ent.connections} links`}
                  size="small"
                  sx={{
                    fontSize: "0.65rem",
                    height: 20,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: tokens.textSecondary
                  }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
