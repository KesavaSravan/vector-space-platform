import React from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Slider,
  Chip,
  IconButton,
  Button
} from "@mui/material";
import {
  Clear as ClearIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { useFilteredPoints } from "../../utils/useFilteredPoints";
import { tokens } from "../../theme";

export default function SearchFilterPanel() {
  const state = useAppState();
  const { updateFilters } = useAppActions();

  // Run the filtering hook to get the count of filtered points for display
  const filteredPoints = useFilteredPoints(state.points, state.filters, state.similarity);

  // Extract unique cluster IDs dynamically
  const uniqueClusters = React.useMemo(() => {
    const set = new Set(state.points.map((p) => p.cluster));
    return Array.from(set).sort((a, b) => a - b);
  }, [state.points]);

  const handleTextChange = (field) => (e) => {
    updateFilters({ [field]: e.target.value });
  };

  const handleSelectChange = (field) => (e) => {
    updateFilters({ [field]: e.target.value });
  };

  const handleSliderChange = (e, val) => {
    updateFilters({ similarityThreshold: val });
  };

  const handleResetFilters = () => {
    updateFilters({
      search: "",
      clusterFilter: "",
      metadataKey: "",
      metadataValue: "",
      similarityThreshold: 0
    });
  };

  const totalPoints = state.points.length;
  const filteredCount = filteredPoints.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* Dynamic Count Banner */}
      <Box
        sx={{
          backgroundColor: tokens.bg,
          px: 1.5,
          py: 1,
          borderRadius: 2,
          border: `1px solid ${tokens.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <Typography variant="body2" sx={{ color: tokens.textSecondary, fontWeight: 500 }}>
          Points Visualized:
        </Typography>
        <Typography variant="subtitle2" className="font-mono" sx={{ color: tokens.signal, fontWeight: 700 }}>
          {filteredCount} / {totalPoints}
        </Typography>
      </Box>

      {/* Keyword Search */}
      <TextField
        label="Search label or ID"
        value={state.filters.search}
        onChange={handleTextChange("search")}
        size="small"
        fullWidth
        slotProps={{
          input: {
            endAdornment: state.filters.search ? (
              <IconButton onClick={() => updateFilters({ search: "" })} size="small" edge="end">
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : (
              <SearchIcon sx={{ fontSize: 16, color: tokens.textMuted }} />
            )
          }
        }}
      />

      {/* Cluster Dropdown */}
      <FormControl size="small" fullWidth>
        <InputLabel>Filter by Cluster</InputLabel>
        <Select
          value={state.filters.clusterFilter}
          label="Filter by Cluster"
          onChange={handleSelectChange("clusterFilter")}
        >
          <MenuItem value="">All Clusters</MenuItem>
          {uniqueClusters.map((c) => (
            <MenuItem key={c} value={c.toString()}>
              {c === -1 ? "Outliers (-1)" : `Cluster ${c}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>



      {/* Similarity Threshold Slider (Active only if point selected) */}
      <Box sx={{ px: 0.5, py: 0.5, border: `1px solid ${tokens.border}`, borderRadius: 2, backgroundColor: `${tokens.bg}40` }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5, px: 1 }}>
          <Typography variant="caption" sx={{ color: state.selectedId ? tokens.textSecondary : tokens.textMuted }}>
            Similarity Threshold
          </Typography>
          <Typography variant="caption" className="font-mono" sx={{ color: state.selectedId ? tokens.signal : tokens.textMuted, fontWeight: 600 }}>
            {state.filters.similarityThreshold}%
          </Typography>
        </Box>
        <Box sx={{ px: 1 }}>
          <Slider
            value={state.filters.similarityThreshold}
            onChange={handleSliderChange}
            disabled={!state.selectedId}
            min={0}
            max={100}
            step={1}
            size="small"
            sx={{
              color: state.selectedId ? tokens.signal : tokens.border
            }}
          />
        </Box>
        {!state.selectedId && (
          <Typography variant="caption" sx={{ color: tokens.textMuted, fontSize: "0.68rem", px: 1, pb: 0.5, display: "block", fontStyle: "italic" }}>
            * Select a node in the 3D scene to unlock similarity filters.
          </Typography>
        )}
      </Box>

      {/* Metadata Key/Value Filter */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 500 }}>
          METADATA FIELDS FILTER
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="Key"
            value={state.filters.metadataKey}
            onChange={handleTextChange("metadataKey")}
            size="small"
            placeholder="e.g. region"
            fullWidth
          />
          <TextField
            label="Value"
            value={state.filters.metadataValue}
            onChange={handleTextChange("metadataValue")}
            size="small"
            placeholder="e.g. us-east-1"
            fullWidth
          />
        </Box>
      </Box>

      {/* Reset filters button */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<FilterIcon />}
        onClick={handleResetFilters}
        fullWidth
        sx={{ mt: 0.5, borderColor: tokens.border, color: tokens.textSecondary }}
      >
        Reset Filters
      </Button>
    </Box>
  );
}
