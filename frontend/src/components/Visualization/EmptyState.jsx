import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import {
  CloudUpload as UploadIcon,
  HelpOutline as HelpIcon,
  Timeline as GraphIcon
} from "@mui/icons-material";
import { useAppActions, useAppState } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function EmptyState() {
  const state = useAppState();
  const { uploadSampleDataset } = useAppActions();

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        p: 3,
        zIndex: 10,
        backgroundColor: tokens.bg
      }}
    >
      <Paper
        className="glass-panel"
        sx={{
          maxWidth: 480,
          p: 4,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2.5,
          boxShadow: `0 16px 40px ${tokens.bg}f0`,
          border: `1px solid ${tokens.border}`,
          borderRadius: 4
        }}
      >
        {/* Glow Sphere Icon */}
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${tokens.signal}30 0%, rgba(0,0,0,0) 70%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px dashed ${tokens.signal}80`,
            mb: 1
          }}
        >
          <GraphIcon sx={{ fontSize: 32, color: tokens.signal }} />
        </Box>

        <Typography variant="h5" className="font-display" sx={{ fontWeight: 700 }}>
          AI Vector Space Visualizer
        </Typography>

        <Typography variant="body2" sx={{ color: tokens.textSecondary, lineHeight: 1.6 }}>
          Explore high-dimensional vector embeddings in an interactive 3D environment. Project documents, sentences, or system alerts and discover relationships, clusters, and neighbor distances.
        </Typography>

        <Box sx={{ width: "100%", textAlign: "left", my: 1 }}>
          <Typography variant="caption" sx={{ color: tokens.textMuted, fontWeight: 600, display: "block", mb: 1 }}>
            SUPPORTED INGESTION METHODS:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20, color: tokens.textSecondary, fontSize: "0.75rem" }}>
            <li style={{ marginBottom: 4 }}>CSV with dimension columns (dim_0...dim_N)</li>
            <li style={{ marginBottom: 4 }}>CSV with a single stringified JSON array column</li>
            <li style={{ marginBottom: 4 }}>JSON lists containing coordinates and metadata</li>
            <li>Direct text encoding via Sentence Transformers / OpenAI</li>
          </ul>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          size="medium"
          onClick={uploadSampleDataset}
          disabled={state.loading.upload}
          fullWidth
          sx={{ py: 1.2, fontWeight: 700 }}
        >
          {state.loading.upload ? "Loading dataset..." : "Load Sample Dataset"}
        </Button>
      </Paper>
    </Box>
  );
}
