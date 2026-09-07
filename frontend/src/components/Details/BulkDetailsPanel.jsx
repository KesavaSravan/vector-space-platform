import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Grid
} from "@mui/material";
import { EditNote as EditIcon } from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function BulkDetailsPanel() {
  const state = useAppState();
  const { bulkUpdateVectors } = useAppActions();

  const [severity, setSeverity] = useState("");
  const [cluster, setCluster] = useState("");
  const [metaKey, setMetaKey] = useState("");
  const [metaValue, setMetaValue] = useState("");

  const { selectedIds, points } = state;

  // Retrieve info on selected points
  const selectedPoints = React.useMemo(() => {
    return points.filter((p) => selectedIds.includes(p.id));
  }, [points, selectedIds]);

  // Aggregate selected stats
  const stats = React.useMemo(() => {
    const clusterCounts = {};
    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };

    selectedPoints.forEach((p) => {
      // Cluster
      clusterCounts[p.cluster] = (clusterCounts[p.cluster] || 0) + 1;
      // Severity
      const sev = p.metadata?.severity || p.severity || "Low";
      if (severityCounts[sev] !== undefined) {
        severityCounts[sev]++;
      }
    });

    return { clusterCounts, severityCounts };
  }, [selectedPoints]);

  const handleApplyChanges = async () => {
    const fields = {};

    if (severity) {
      fields.severity = severity;
    }
    if (cluster !== "") {
      fields.cluster = parseInt(cluster);
    }
    if (metaKey.trim()) {
      fields.metadata = {
        [metaKey.trim()]: metaValue.trim()
      };
    }

    if (Object.keys(fields).length === 0) {
      return; // Nothing to update
    }

    await bulkUpdateVectors(selectedIds, fields);

    // Reset inputs
    setSeverity("");
    setCluster("");
    setMetaKey("");
    setMetaValue("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Header Info */}
      <Box>
        <Typography variant="h6" className="font-display" sx={{ fontWeight: 700, color: tokens.textPrimary, mb: 0.5 }}>
          Bulk Selection
        </Typography>
        <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal, fontWeight: 700, display: "block", mb: 1.5 }}>
          {selectedIds.length} NODES SELECTED IN 3D SCENE
        </Typography>
      </Box>

      {/* Aggregate Stats */}
      <Box>
        <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block", mb: 1 }}>
          SELECTION SUMMARY
        </Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={6}>
            <Paper sx={{ p: 1.5, height: "100%", backgroundColor: tokens.bg }}>
              <Typography variant="caption" sx={{ color: tokens.textSecondary, display: "block", mb: 0.5 }}>
                Severity Mix
              </Typography>
              {Object.entries(stats.severityCounts).map(([key, count]) => (
                count > 0 && (
                  <Box key={key} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: tokens.textSecondary }}>{key}</Typography>
                    <Typography variant="caption" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
                      {count}
                    </Typography>
                  </Box>
                )
              ))}
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper sx={{ p: 1.5, height: "100%", backgroundColor: tokens.bg }}>
              <Typography variant="caption" sx={{ color: tokens.textSecondary, display: "block", mb: 0.5 }}>
                Clusters represented
              </Typography>
              {Object.entries(stats.clusterCounts).map(([cId, count]) => (
                <Box key={cId} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                    {cId === "-1" ? "Outliers" : `Cluster ${cId}`}
                  </Typography>
                  <Typography variant="caption" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
                    {count}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Divider />

      {/* Edit Form */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block" }}>
          EDIT METADATA EN MASSE
        </Typography>

        {/* Change Severity Dropdown */}
        <FormControl size="small" fullWidth>
          <InputLabel>Change Severity</InputLabel>
          <Select
            value={severity}
            label="Change Severity"
            onChange={(e) => setSeverity(e.target.value)}
          >
            <MenuItem value="">-- Keep Current --</MenuItem>
            <MenuItem value="Critical">Critical (Red)</MenuItem>
            <MenuItem value="High">High (Orange)</MenuItem>
            <MenuItem value="Medium">Medium (Yellow)</MenuItem>
            <MenuItem value="Low">Low (Green)</MenuItem>
          </Select>
        </FormControl>

        {/* Change Cluster TextField */}
        <TextField
          label="Re-assign Cluster ID"
          type="number"
          value={cluster}
          onChange={(e) => setCluster(e.target.value)}
          placeholder="e.g. 2"
          size="small"
          fullWidth
        />

        {/* Custom Metadata Key Value Update */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
            Add / Update Custom Attribute
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Key"
              value={metaKey}
              onChange={(e) => setMetaKey(e.target.value)}
              placeholder="e.g. owner"
              size="small"
              fullWidth
            />
            <TextField
              label="Value"
              value={metaValue}
              onChange={(e) => setMetaValue(e.target.value)}
              placeholder="e.g. DevOps"
              size="small"
              fullWidth
            />
          </Box>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          size="small"
          startIcon={<EditIcon />}
          onClick={handleApplyChanges}
          disabled={state.loading.cluster || (!severity && cluster === "" && !metaKey.trim())}
          sx={{ mt: 1 }}
          fullWidth
        >
          Apply Changes
        </Button>
      </Box>
    </Box>
  );
}
