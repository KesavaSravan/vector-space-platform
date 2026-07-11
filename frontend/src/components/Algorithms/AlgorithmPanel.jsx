import React from "react";
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Button,
  FormControl,
  FormLabel,
  Divider,
  Grid,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  InputLabel
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Brush as PaintIcon,
  Timeline as RunIcon
} from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function AlgorithmPanel() {
  const state = useAppState();
  const {
    runReduction,
    runClustering,
    updateAlgo,
    setNotice
  } = useAppActions();

  const handleReductionMethodChange = (e, val) => {
    if (val !== null) {
      updateAlgo({ reductionMethod: val });
    }
  };

  const handleDimensionChange = (e, val) => {
    if (val !== null) {
      updateAlgo({ nComponents: val });
    }
  };

  const handleClusterMethodChange = (e, val) => {
    if (val !== null) {
      updateAlgo({ clusterMethod: val });
    }
  };

  const handleColorByChange = (e) => {
    updateAlgo({ colorBy: e.target.value });
  };

  const handleRunReduction = () => {
    runReduction(state.algo.reductionMethod, state.algo.nComponents);
  };

  const handleRunClustering = () => {
    runClustering(state.algo.clusterMethod);
  };

  const pointsCount = state.points.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 1. Dimension Reduction Selector */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 600 }}>
          DIMENSIONALITY REDUCTION
        </Typography>
        
        <ToggleButtonGroup
          value={state.algo.reductionMethod}
          exclusive
          onChange={handleReductionMethodChange}
          size="small"
          fullWidth
        >
          <ToggleButton value="pca">PCA</ToggleButton>
          <ToggleButton value="tsne">t-SNE</ToggleButton>
          <ToggleButton value="umap">UMAP</ToggleButton>
        </ToggleButtonGroup>

        {/* 2D vs 3D */}
        <Grid container alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              Components
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <ToggleButtonGroup
              value={state.algo.nComponents}
              exclusive
              onChange={handleDimensionChange}
              size="small"
              fullWidth
            >
              <ToggleButton value={2}>2D</ToggleButton>
              <ToggleButton value={3}>3D</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>

        {/* Method specific params */}
        {state.algo.reductionMethod === "tsne" && (
          <Box sx={{ px: 1, mt: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Perplexity</Typography>
              <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal }}>
                {state.algo.perplexity || 30}
              </Typography>
            </Box>
            <Slider
              value={state.algo.perplexity || 30}
              min={5}
              max={50}
              step={1}
              onChange={(e, val) => updateAlgo({ perplexity: val })}
              size="small"
            />
          </Box>
        )}

        {state.algo.reductionMethod === "umap" && (
          <Box sx={{ px: 1, mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Neighbors</Typography>
                <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal }}>
                  {state.algo.nNeighbors || 15}
                </Typography>
              </Box>
              <Slider
                value={state.algo.nNeighbors || 15}
                min={2}
                max={50}
                step={1}
                onChange={(e, val) => updateAlgo({ nNeighbors: val })}
                size="small"
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Min Distance</Typography>
                <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal }}>
                  {state.algo.minDist || 0.1}
                </Typography>
              </Box>
              <Slider
                value={state.algo.minDist || 0.1}
                min={0.01}
                max={0.99}
                step={0.01}
                onChange={(e, val) => updateAlgo({ minDist: val })}
                size="small"
              />
            </Box>
          </Box>
        )}

        <Button
          variant="contained"
          size="small"
          startIcon={<RunIcon />}
          onClick={handleRunReduction}
          disabled={state.loading.reduce || pointsCount === 0}
          sx={{ mt: 1 }}
        >
          Compute Projection
        </Button>
      </Box>

      <Divider />

      {/* 2. Clustering Selector */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 600 }}>
          CLUSTERING ALGORITHMS
        </Typography>

        <ToggleButtonGroup
          value={state.algo.clusterMethod}
          exclusive
          onChange={handleClusterMethodChange}
          size="small"
          fullWidth
        >
          <ToggleButton value="kmeans">KMeans</ToggleButton>
          <ToggleButton value="dbscan">DBSCAN</ToggleButton>
        </ToggleButtonGroup>

        {state.algo.clusterMethod === "kmeans" && (
          <Box sx={{ px: 1, mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={state.algo.nClusters <= 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateAlgo({ nClusters: -1 });
                    } else {
                      updateAlgo({ nClusters: 5 });
                    }
                  }}
                  size="small"
                  sx={{ color: tokens.border, "&.Mui-checked": { color: tokens.signal } }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
                  Auto-detect optimal clusters (Silhouette)
                </Typography>
              }
            />
            {state.algo.nClusters > 0 ? (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                  <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Number of clusters (K)</Typography>
                  <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal }}>
                    {state.algo.nClusters}
                  </Typography>
                </Box>
                <Slider
                  value={state.algo.nClusters}
                  min={2}
                  max={15}
                  step={1}
                  onChange={(e, val) => updateAlgo({ nClusters: val })}
                  size="small"
                />
              </>
            ) : (
              <Typography variant="caption" sx={{ color: tokens.textMuted, fontStyle: "italic", pl: 1 }}>
                * Silhouette coefficient search (K = 2 to 10) will run automatically.
              </Typography>
            )}
          </Box>
        )}

        {state.algo.clusterMethod === "dbscan" && (
          <Box sx={{ px: 1, mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Epsilon (eps)</Typography>
                <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal }}>
                  {state.algo.eps}
                </Typography>
              </Box>
              <Slider
                value={state.algo.eps}
                min={0.1}
                max={2.5}
                step={0.05}
                onChange={(e, val) => updateAlgo({ eps: val })}
                size="small"
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>Min Samples</Typography>
                <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal }}>
                  {state.algo.minSamples}
                </Typography>
              </Box>
              <Slider
                value={state.algo.minSamples}
                min={2}
                max={15}
                step={1}
                onChange={(e, val) => updateAlgo({ minSamples: val })}
                size="small"
              />
            </Box>
          </Box>
        )}

        <Button
          variant="contained"
          color="secondary"
          size="small"
          startIcon={<SettingsIcon />}
          onClick={handleRunClustering}
          disabled={state.loading.cluster || pointsCount === 0}
          sx={{ mt: 1 }}
        >
          Compute Clusters
        </Button>
      </Box>

      <Divider />

      {/* 3. Rendering / Design Settings */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 600 }}>
          3D VIEW SETTINGS
        </Typography>

        {/* Color Mapping Selector */}
        <FormControl size="small" fullWidth>
          <InputLabel id="color-by-select-label">Color Mapping Mode</InputLabel>
          <Select
            labelId="color-by-select-label"
            value={state.algo.colorBy}
            label="Color Mapping Mode"
            onChange={handleColorByChange}
            sx={{
              "& .MuiSelect-select": {
                py: 1,
                fontSize: "0.85rem"
              }
            }}
          >
            <MenuItem value="cluster">Cluster Colors</MenuItem>
            <MenuItem value="severity">Severity Alerts</MenuItem>
            {/* Extract and render unique metadata keys dynamically */}
            {(() => {
              const keys = new Set();
              state.points.forEach((p) => {
                if (p.metadata) {
                  Object.keys(p.metadata).forEach((k) => {
                    if (
                      k !== "original_text" &&
                      k !== "text_snippet" &&
                      k !== "original_number" &&
                      k !== "severity"
                    ) {
                      keys.add(k);
                    }
                  });
                }
              });
              return Array.from(keys).sort().map((k) => (
                <MenuItem key={k} value={`metadata:${k}`}>
                  Metadata: {k}
                </MenuItem>
              ));
            })()}
          </Select>
        </FormControl>

        {/* Point Style Selector (LOD override) */}
        <FormControl size="small" fullWidth>
          <InputLabel id="point-style-select-label">Point Render Style</InputLabel>
          <Select
            labelId="point-style-select-label"
            value={state.pointStyle || "auto"}
            label="Point Render Style"
            onChange={(e) => {
              const { setPointStyle } = useAppActions();
              // Wait, since we are inside functional component we can invoke action creator direct
              dispatch({ type: "SET_POINT_STYLE", payload: e.target.value });
            }}
            sx={{
              "& .MuiSelect-select": {
                py: 1,
                fontSize: "0.85rem"
              }
            }}
          >
            <MenuItem value="auto">Auto-Select (LOD performance)</MenuItem>
            <MenuItem value="spheres">High-Poly Spheres (Quality)</MenuItem>
            <MenuItem value="lowpoly">Low-Poly Spheres</MenuItem>
            <MenuItem value="cubes">Cubes (Fast)</MenuItem>
            <MenuItem value="points">Point Cloud (Fastest)</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
