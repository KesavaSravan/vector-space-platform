import React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Chip
} from "@mui/material";
import { InfoOutlined as InfoIcon } from "@mui/icons-material";
import { useAppState } from "../../context/AppContext";
import { CLUSTER_COLORS, SEVERITY_COLORS, tokens } from "../../theme";

export default function VectorDetails() {
  const state = useAppState();
  const { selectedId, points } = state;

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
        <InfoIcon sx={{ fontSize: 48, color: tokens.textMuted }} />
        <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
          No Vector Selected. Click a point in the 3D scene to inspect its details and search for similar vectors.
        </Typography>
      </Box>
    );
  }

  const point = points.find((p) => p.id === selectedId);
  if (!point) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error">
          Error: Selected vector details could not be found in state.
        </Typography>
      </Box>
    );
  }

  const severity = point.metadata?.severity || point.severity || "Low";
  const clusterColor = CLUSTER_COLORS[point.cluster === -1 ? 14 : Math.abs(point.cluster) % CLUSTER_COLORS.length];
  const severityColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Low;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Header Info */}
      <Box>
        <Typography variant="h6" className="font-display" sx={{ fontWeight: 700, color: tokens.textPrimary, mb: 0.5 }}>
          {point.label}
        </Typography>
        <Typography variant="caption" className="font-mono" sx={{ color: tokens.textSecondary, display: "block", mb: 1.5 }}>
          ID: {point.id}
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            label={`Severity: ${severity}`}
            size="small"
            sx={{
              backgroundColor: `${severityColor}20`,
              color: severityColor,
              border: `1px solid ${severityColor}40`,
              fontWeight: 600
            }}
          />
          <Chip
            label={point.cluster === -1 ? "Outlier cluster" : `Cluster ${point.cluster}`}
            size="small"
            sx={{
              backgroundColor: `${clusterColor}20`,
              color: clusterColor,
              border: `1px solid ${clusterColor}40`,
              fontWeight: 600
            }}
          />
        </Box>
      </Box>

      {/* Projection Coordinates Details */}
      <Box>
        <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block", mb: 1 }}>
          PROJECTION COORDINATES
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Paper sx={{ flex: 1, p: 1, textAlign: "center", backgroundColor: tokens.bg }}>
            <Typography variant="caption" sx={{ color: tokens.textMuted }}>X Axis</Typography>
            <Typography variant="body2" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
              {point.coords[0]?.toFixed(4) || "0.0000"}
            </Typography>
          </Paper>
          <Paper sx={{ flex: 1, p: 1, textAlign: "center", backgroundColor: tokens.bg }}>
            <Typography variant="caption" sx={{ color: tokens.textMuted }}>Y Axis</Typography>
            <Typography variant="body2" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
              {point.coords[1]?.toFixed(4) || "0.0000"}
            </Typography>
          </Paper>
          {point.coords[2] !== undefined && (
            <Paper sx={{ flex: 1, p: 1, textAlign: "center", backgroundColor: tokens.bg }}>
              <Typography variant="caption" sx={{ color: tokens.textMuted }}>Z Axis</Typography>
              <Typography variant="body2" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
                {point.coords[2]?.toFixed(4) || "0.0000"}
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Metadata Attributes table */}
      <Box>
        <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block", mb: 1 }}>
          METADATA ATTRIBUTES
        </Typography>
        <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface2 }}>
          <Table size="small">
            <TableBody>
              {Object.entries(point.metadata || {}).map(([key, val]) => (
                <TableRow key={key} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{
                      color: tokens.textSecondary,
                      fontWeight: 600,
                      fontFamily: tokens.fontMono,
                      fontSize: "0.72rem",
                      width: "40%",
                      borderColor: tokens.border
                    }}
                  >
                    {key}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: tokens.textPrimary,
                      fontSize: "0.75rem",
                      borderColor: tokens.border,
                      wordBreak: "break-all"
                    }}
                  >
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
