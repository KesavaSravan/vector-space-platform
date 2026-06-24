import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Divider,
  LinearProgress,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  DeleteOutline as DeleteIcon,
  PlayArrow as GoIcon,
  Visibility as EyeIcon,
  VisibilityOff as EyeOffIcon,
  ExpandMore as ExpandMoreIcon
} from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function UploadPanel() {
  const state = useAppState();
  const {
    uploadFile,
    uploadSampleDataset,
    clearAll,
    generateTextEmbeddings
  } = useAppActions();

  const [aiOpen, setAiOpen] = useState(false);
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-embedding-001");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureDeployment, setAzureDeployment] = useState("");
  const [documentsText, setDocumentsText] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleAiSubmit = () => {
    if (!documentsText.trim()) return;
    const documents = documentsText
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);

    if (documents.length === 0) return;

    generateTextEmbeddings({
      provider,
      documents,
      model: model || undefined,
      api_key: apiKey || undefined,
      azure_endpoint: azureEndpoint || undefined,
      azure_deployment: azureDeployment || undefined
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* File Upload Zone */}
      <Box>
        <input
          accept=".csv,.json"
          style={{ display: "none" }}
          id="upload-file-input"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="upload-file-input">
          <Button
            variant="outlined"
            component="span"
            fullWidth
            startIcon={<UploadIcon />}
            sx={{
              borderStyle: "dashed",
              borderWidth: 2,
              borderColor: tokens.border,
              py: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              "&:hover": {
                borderColor: tokens.accent,
                backgroundColor: `${tokens.accent}08`
              }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.textPrimary }}>
              Upload CSV or JSON
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.textMuted }}>
              CSV (wide or single string) or JSON array
            </Typography>
          </Button>
        </label>
      </Box>

      {/* Progress during uploads */}
      {state.loading.upload && (
        <Box sx={{ width: "100%" }}>
          <Typography variant="caption" sx={{ color: tokens.signal, mb: 0.5, display: "block" }}>
            Ingesting vectors and preparing index...
          </Typography>
          <LinearProgress color="secondary" />
        </Box>
      )}

      {/* Utility Actions */}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="contained"
          onClick={uploadSampleDataset}
          fullWidth
          disabled={state.loading.upload}
          size="small"
        >
          Load Sample
        </Button>
        {state.points.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={clearAll}
            size="small"
            sx={{ minWidth: 100 }}
          >
            Clear
          </Button>
        )}
      </Box>

      <Divider sx={{ my: 0.5 }} />

      {/* AI Embedding Generator Section */}
      <Box>
        <Button
          fullWidth
          onClick={() => setAiOpen(!aiOpen)}
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: aiOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s"
              }}
            />
          }
          sx={{
            justifyContent: "space-between",
            px: 1,
            color: tokens.textSecondary,
            "&:hover": { color: tokens.textPrimary }
          }}
        >
          <Typography variant="subtitle2" className="font-display" sx={{ fontWeight: 600 }}>
            AI Text Vectorization
          </Typography>
        </Button>

        <Collapse in={aiOpen}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
            {/* Provider Selector */}
            <FormControl size="small" fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select
                value={provider}
                label="Provider"
                onChange={(e) => {
                  const val = e.target.value;
                  setProvider(val);
                  if (val === "gemini") {
                    setModel("gemini-embedding-001");
                  } else if (val === "sentence-transformers") {
                    setModel("all-MiniLM-L6-v2");
                  } else if (val === "openai") {
                    setModel("text-embedding-3-small");
                  } else {
                    setModel("");
                  }
                }}
              >
                <MenuItem value="gemini">Gemini (Cloud API)</MenuItem>
                <MenuItem value="sentence-transformers">Sentence Transformers (Local)</MenuItem>
                <MenuItem value="openai">OpenAI (Cloud API)</MenuItem>
                <MenuItem value="azure">Azure OpenAI</MenuItem>
              </Select>
            </FormControl>

            {/* Model Name */}
            <TextField
              label="Model Name"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              size="small"
              fullWidth
              placeholder={
                provider === "gemini"
                  ? "gemini-embedding-001"
                  : provider === "sentence-transformers"
                  ? "all-MiniLM-L6-v2"
                  : "text-embedding-3-small"
              }
            />

            {/* API Key */}
            {provider !== "sentence-transformers" && provider !== "gemini" && (
              <TextField
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type={showKey ? "text" : "password"}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowKey(!showKey)} edge="end">
                          {showKey ? <EyeOffIcon /> : <EyeIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            )}

            {/* Azure specifics */}
            {provider === "azure" && (
              <>
                <TextField
                  label="Azure Endpoint"
                  value={azureEndpoint}
                  onChange={(e) => setAzureEndpoint(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="https://YOUR_RESOURCE.openai.azure.com/"
                />
                <TextField
                  label="Deployment Name"
                  value={azureDeployment}
                  onChange={(e) => setAzureDeployment(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="e.g. text-embedding-ada-002"
                />
              </>
            )}

            {/* Document Texts Input */}
            <TextField
              label="Documents (one per line)"
              value={documentsText}
              onChange={(e) => setDocumentsText(e.target.value)}
              multiline
              rows={4}
              size="small"
              fullWidth
              placeholder="Database migration completed&#10;Memory leak detected in microservice&#10;Frontend bundle size optimization"
            />

            {state.loading.embed && (
              <Box sx={{ width: "100%" }}>
                <Typography variant="caption" sx={{ color: tokens.signal, mb: 0.5, display: "block" }}>
                  Generating embeddings and projecting...
                </Typography>
                <LinearProgress color="secondary" />
              </Box>
            )}

            <Button
              variant="contained"
              color="secondary"
              startIcon={<GoIcon />}
              fullWidth
              onClick={handleAiSubmit}
              disabled={state.loading.embed || !documentsText.trim()}
              size="small"
            >
              Generate & Project
            </Button>

            <Typography variant="caption" sx={{ color: tokens.textMuted, textAlign: "center", fontStyle: "italic" }}>
              API key sent to backend for this request only; never stored.
            </Typography>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
