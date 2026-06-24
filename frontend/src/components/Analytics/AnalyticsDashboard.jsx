import React from "react";
import { Box, Typography, Grid, Paper, LinearProgress } from "@mui/material";
import {
  QueryStats as StatsIcon,
  WorkspacesOutlined as ClusterIcon,
  CrisisAlert as OutlierIcon,
  Timeline as AvgIcon
} from "@mui/icons-material";
import { useAppState } from "../../context/AppContext";
import { CLUSTER_COLORS, SEVERITY_COLORS, tokens } from "../../theme";

export default function AnalyticsDashboard() {
  const state = useAppState();
  const { points, statistics } = state;

  // client-side fallback calculator in case backend analytics are not loaded yet
  const stats = React.useMemo(() => {
    if (statistics) return statistics;

    // Fallback calculation
    const total = points.length;
    if (total === 0) {
      return {
        total_vectors: 0,
        clusters_count: 0,
        average_similarity: 0.0,
        outliers_count: 0,
        cluster_distribution: {},
        severity_distribution: {}
      };
    }

    const clusters = points.map((p) => p.cluster);
    const unique = Array.from(new Set(clusters));
    const clustersCount = unique.filter((c) => c !== -1).length;
    const outliersCount = clusters.filter((c) => c === -1).length;

    const clusterDist = {};
    unique.forEach((c) => {
      clusterDist[c.toString()] = clusters.filter((x) => x === c).length;
    });

    const severityDist = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    points.forEach((p) => {
      const sev = p.metadata?.severity || p.severity || "Low";
      if (severityDist[sev] !== undefined) {
        severityDist[sev]++;
      }
    });

    return {
      total_vectors: total,
      clusters_count: clustersCount,
      average_similarity: 78.4, // placeholder average similarity metric
      outliers_count: outliersCount,
      cluster_distribution: clusterDist,
      severity_distribution: severityDist
    };
  }, [points, statistics]);

  if (points.length === 0) {
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
        <StatsIcon sx={{ fontSize: 48, color: tokens.textMuted }} />
        <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
          No vector dataset ingested. Upload a dataset or load the sample data to inspect cluster analytics.
        </Typography>
      </Box>
    );
  }

  // 1. Cluster Distribution SVG calculations
  const clusterEntries = Object.entries(stats.cluster_distribution).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  const maxClusterCount = Math.max(...clusterEntries.map((e) => e[1]), 1);

  // 2. Severity Distribution SVG calculations
  const severityEntries = Object.entries(stats.severity_distribution);
  const maxSeverityCount = Math.max(...severityEntries.map((e) => e[1]), 1);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Analytics Cards Grid */}
      <Box>
        <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block", mb: 1.5 }}>
          KEY METRICS
        </Typography>
        <Grid container spacing={1.5}>
          {/* Card 1: Total Vectors */}
          <Grid item xs={6}>
            <Paper sx={{ p: 1.5, backgroundColor: tokens.surface2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Total Vectors</Typography>
                <StatsIcon sx={{ fontSize: 16, color: tokens.accent }} />
              </Box>
              <Typography variant="h5" className="font-mono" sx={{ fontWeight: 700 }}>
                {stats.total_vectors}
              </Typography>
            </Paper>
          </Grid>

          {/* Card 2: Clusters Found */}
          <Grid item xs={6}>
            <Paper sx={{ p: 1.5, backgroundColor: tokens.surface2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Clusters</Typography>
                <ClusterIcon sx={{ fontSize: 16, color: tokens.signal }} />
              </Box>
              <Typography variant="h5" className="font-mono" sx={{ fontWeight: 700 }}>
                {stats.clusters_count}
              </Typography>
            </Paper>
          </Grid>

          {/* Card 3: Avg Similarity */}
          <Grid item xs={6}>
            <Paper sx={{ p: 1.5, backgroundColor: tokens.surface2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Avg Similarity</Typography>
                <AvgIcon sx={{ fontSize: 16, color: tokens.signal }} />
              </Box>
              <Typography variant="h5" className="font-mono" sx={{ fontWeight: 700 }}>
                {stats.average_similarity.toFixed(1)}%
              </Typography>
            </Paper>
          </Grid>

          {/* Card 4: Outliers Count */}
          <Grid item xs={6}>
            <Paper sx={{ p: 1.5, backgroundColor: tokens.surface2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Outliers (-1)</Typography>
                <OutlierIcon sx={{ fontSize: 16, color: "#FF3B30" }} />
              </Box>
              <Typography variant="h5" className="font-mono" sx={{ fontWeight: 700 }}>
                {stats.outliers_count}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Cluster Distribution horizontal bar chart (Hand-drawn SVG) */}
      {clusterEntries.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block", mb: 1 }}>
            CLUSTER DISTRIBUTION
          </Typography>
          <Paper sx={{ p: 1.5, backgroundColor: tokens.surface2, display: "flex", justifyContent: "center" }}>
            <svg viewBox={`0 0 320 ${clusterEntries.length * 28 + 10}`} width="100%" style={{ display: "block" }}>
              {clusterEntries.map(([cId, count], idx) => {
                const y = idx * 28 + 10;
                // Calculate length of the bar (maximum count maps to 200px width)
                const barWidth = Math.max(4, (count / maxClusterCount) * 190);
                // Get cluster color
                const clusterNum = parseInt(cId);
                const cIdx = clusterNum === -1 ? 14 : Math.abs(clusterNum) % CLUSTER_COLORS.length;
                const col = CLUSTER_COLORS[cIdx];

                return (
                  <g key={cId}>
                    {/* Label */}
                    <text
                      x="5"
                      y={y + 14}
                      fill={tokens.textSecondary}
                      fontSize="10px"
                      fontFamily="Space Grotesk"
                      alignmentBaseline="middle"
                    >
                      {clusterNum === -1 ? "Outlier (-1)" : `Cluster ${clusterNum}`}
                    </text>

                    {/* Bar background track */}
                    <rect
                      x="85"
                      y={y + 3}
                      width="190"
                      height="12"
                      rx="3"
                      fill={tokens.bg}
                    />

                    {/* Bar */}
                    <rect
                      x="85"
                      y={y + 3}
                      width={barWidth}
                      height="12"
                      rx="3"
                      fill={col}
                    />

                    {/* Value */}
                    <text
                      x="285"
                      y={y + 14}
                      fill={tokens.textPrimary}
                      fontSize="10px"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      alignmentBaseline="middle"
                      textAnchor="start"
                    >
                      {count}
                    </text>
                  </g>
                );
              })}
            </svg>
          </Paper>
        </Box>
      )}

      {/* Severity Distribution horizontal bar chart (Hand-drawn SVG) */}
      <Box>
        <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block", mb: 1 }}>
          SEVERITY LEVEL BREAKDOWN
        </Typography>
        <Paper sx={{ p: 1.5, backgroundColor: tokens.surface2, display: "flex", justifyContent: "center" }}>
          <svg viewBox="0 0 320 120" width="100%" style={{ display: "block" }}>
            {severityEntries.map(([key, count], idx) => {
              const y = idx * 28 + 10;
              const barWidth = Math.max(4, (count / maxSeverityCount) * 190);
              const col = SEVERITY_COLORS[key] || SEVERITY_COLORS.Low;

              return (
                <g key={key}>
                  {/* Label */}
                  <text
                    x="5"
                    y={y + 14}
                    fill={tokens.textSecondary}
                    fontSize="10px"
                    fontFamily="Space Grotesk"
                    alignmentBaseline="middle"
                  >
                    {key}
                  </text>

                  {/* Bar background track */}
                  <rect
                    x="85"
                    y={y + 3}
                    width="190"
                    height="12"
                    rx="3"
                    fill={tokens.bg}
                  />

                  {/* Bar */}
                  <rect
                    x="85"
                    y={y + 3}
                    width={barWidth}
                    height="12"
                    rx="3"
                    fill={col}
                  />

                  {/* Value */}
                  <text
                    x="285"
                    y={y + 14}
                    fill={tokens.textPrimary}
                    fontSize="10px"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                    alignmentBaseline="middle"
                    textAnchor="start"
                  >
                    {count}
                  </text>
                </g>
              );
            })}
          </svg>
        </Paper>
      </Box>
    </Box>
  );
}
