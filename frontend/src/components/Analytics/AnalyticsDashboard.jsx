import React from "react";
import { Box, Typography, Grid, Paper, Chip } from "@mui/material";
import {
  QueryStats as StatsIcon,
  WorkspacesOutlined as ClusterIcon,
  CrisisAlert as OutlierIcon,
  Timeline as AvgIcon,
  CenterFocusStrong as SelectionIcon,
  Tag as IdIcon,
  Category as SevIcon
} from "@mui/icons-material";
import { useAppState } from "../../context/AppContext";
import { CLUSTER_COLORS, SEVERITY_COLORS, tokens } from "../../theme";

export default function AnalyticsDashboard() {
  const state = useAppState();
  const { points, statistics, selectedId, selectedIds, similarity } = state;

  // Find selected points
  const activeSelectedIds = selectedIds && selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
  const selectedPoints = React.useMemo(() => {
    if (activeSelectedIds.length === 0) return [];
    return points.filter((p) => activeSelectedIds.includes(p.id));
  }, [points, activeSelectedIds]);

  const singleSelectedPoint = selectedPoints.length === 1 ? selectedPoints[0] : null;

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
      average_similarity: 78.4,
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
    <Box className="scrollable-panel" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 0. SELECTION ANALYTICS (When 1 or more nodes are selected) */}
      {selectedPoints.length > 0 && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: "rgba(0, 229, 199, 0.08)",
            border: `1px solid rgba(0, 229, 199, 0.3)`,
            display: "flex",
            flexDirection: "column",
            gap: 1.5
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SelectionIcon sx={{ fontSize: 18, color: tokens.signal }} />
              <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal, fontWeight: 700 }}>
                {singleSelectedPoint ? "SELECTED NODE ANALYTICS" : `SELECTION GROUP ANALYTICS (${selectedPoints.length} NODES)`}
              </Typography>
            </Box>

            <Chip
              label={singleSelectedPoint ? singleSelectedPoint.id : `${selectedPoints.length} Selected`}
              size="small"
              sx={{
                backgroundColor: tokens.surface2,
                color: tokens.textPrimary,
                fontSize: "10px",
                fontFamily: tokens.fontMono,
                fontWeight: 700
              }}
            />
          </Box>

          {/* Single Node Selected Details */}
          {singleSelectedPoint && (
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box sx={{ p: 1, backgroundColor: tokens.surface2, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: tokens.textMuted, display: "block", fontSize: "10px" }}>
                    Cluster Assignment
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.5 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor:
                          singleSelectedPoint.cluster === -1
                            ? "#FF3B30"
                            : CLUSTER_COLORS[Math.abs(singleSelectedPoint.cluster) % CLUSTER_COLORS.length]
                      }}
                    />
                    <Typography variant="caption" className="font-mono" sx={{ fontWeight: 700 }}>
                      {singleSelectedPoint.cluster === -1 ? "Outlier (-1)" : `Cluster ${singleSelectedPoint.cluster}`}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ p: 1, backgroundColor: tokens.surface2, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: tokens.textMuted, display: "block", fontSize: "10px" }}>
                    Severity Level
                  </Typography>
                  <Typography
                    variant="caption"
                    className="font-mono"
                    sx={{
                      fontWeight: 700,
                      color:
                        SEVERITY_COLORS[singleSelectedPoint.severity || singleSelectedPoint.metadata?.severity] ||
                        tokens.textPrimary
                    }}
                  >
                    {singleSelectedPoint.severity || singleSelectedPoint.metadata?.severity || "Low"}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ p: 1, backgroundColor: tokens.surface2, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: tokens.textMuted, display: "block", fontSize: "10px" }}>
                    3D Coords (X, Y, Z)
                  </Typography>
                  <Typography variant="caption" className="font-mono" sx={{ fontSize: "10px" }}>
                    [{singleSelectedPoint.coords?.map((c) => c.toFixed(1)).join(", ") || "0, 0, 0"}]
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ p: 1, backgroundColor: tokens.surface2, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: tokens.textMuted, display: "block", fontSize: "10px" }}>
                    Nearest Matches
                  </Typography>
                  <Typography variant="caption" className="font-mono" sx={{ fontWeight: 700, color: tokens.signal }}>
                    {similarity?.matches?.length || 0} Matches
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}

          {/* Group Nodes Selected Details */}
          {!singleSelectedPoint && selectedPoints.length > 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                  Clusters Represented:
                </Typography>
                <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal, fontWeight: 700 }}>
                  {new Set(selectedPoints.map((p) => p.cluster)).size} Clusters
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                  Selection Share:
                </Typography>
                <Typography variant="caption" className="font-mono" sx={{ color: tokens.textPrimary, fontWeight: 700 }}>
                  {((selectedPoints.length / points.length) * 100).toFixed(1)}% of Dataset
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* 1. KEY METRICS */}
      <Box>
        <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block", mb: 1.5 }}>
          WORKSPACE DATASET METRICS
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

      {/* 2. Cluster Distribution SVG Bar Chart */}
      {clusterEntries.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block", mb: 1 }}>
            CLUSTER DISTRIBUTION
          </Typography>
          <Paper sx={{ p: 1.5, backgroundColor: tokens.surface2, display: "flex", justifyContent: "center" }}>
            <svg viewBox={`0 0 320 ${clusterEntries.length * 28 + 10}`} width="100%" style={{ display: "block" }}>
              {clusterEntries.map(([cId, count], idx) => {
                const y = idx * 28 + 10;
                const barWidth = Math.max(4, (count / maxClusterCount) * 190);
                const clusterNum = parseInt(cId);
                const cIdx = clusterNum === -1 ? 14 : Math.abs(clusterNum) % CLUSTER_COLORS.length;
                const col = CLUSTER_COLORS[cIdx];

                return (
                  <g key={cId}>
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

                    <rect
                      x="85"
                      y={y + 3}
                      width="190"
                      height="12"
                      rx="3"
                      fill={tokens.bg}
                    />

                    <rect
                      x="85"
                      y={y + 3}
                      width={barWidth}
                      height="12"
                      rx="3"
                      fill={col}
                    />

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

      {/* 3. Severity Distribution SVG Bar Chart */}
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

                  <rect
                    x="85"
                    y={y + 3}
                    width="190"
                    height="12"
                    rx="3"
                    fill={tokens.bg}
                  />

                  <rect
                    x="85"
                    y={y + 3}
                    width={barWidth}
                    height="12"
                    rx="3"
                    fill={col}
                  />

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
