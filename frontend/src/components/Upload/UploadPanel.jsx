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
  IconButton,
  Tabs,
  Tab,
  Checkbox,
  ListItemText
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  DeleteOutline as DeleteIcon,
  PlayArrow as GoIcon,
  Visibility as EyeIcon,
  VisibilityOff as EyeOffIcon,
  ExpandMore as ExpandMoreIcon,
  FileDownload as DownloadIcon
} from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function UploadPanel() {
  const state = useAppState();
  const {
    uploadFile,
    uploadSampleDataset,
    clearAll,
    generateTextEmbeddings,
    generateTextEmbeddingsStructured,
    generateFileEmbeddings,
    parseHeaders,
    downloadEmbeddingsCsv
  } = useAppActions();

  const [aiOpen, setAiOpen] = useState(false);
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-embedding-001");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureDeployment, setAzureDeployment] = useState("");
  
  // Ingest state
  const [activeTab, setActiveTab] = useState(0); // 0 = Simple List, 1 = Paste Number - Text, 2 = Excel or CSV file
  const [documentsText, setDocumentsText] = useState("");
  const [structuredText, setStructuredText] = useState("");
  const [excelFile, setExcelFile] = useState(null);

  // Custom columns mapping state
  const [headers, setHeaders] = useState([]);
  const [selectedIdCol, setSelectedIdCol] = useState("");
  const [selectedVectorCols, setSelectedVectorCols] = useState([]);
  const [parsingHeaders, setParsingHeaders] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleExcelFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFile(file);
    setParsingHeaders(true);
    setHeaders([]);
    setSelectedIdCol("");
    setSelectedVectorCols([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await parseHeaders(formData);
      if (res && res.headers) {
        setHeaders(res.headers);
        
        // Find sensible defaults
        const idColMatch = res.headers.find(h => 
          ["id", "number", "no.", "no", "num", "ticket_id", "ticket id"].includes(String(h).toLowerCase())
        );
        if (idColMatch) {
          setSelectedIdCol(idColMatch);
        } else if (res.headers.length > 0) {
          setSelectedIdCol(res.headers[0]);
        }
        
        const textColMatch = res.headers.find(h => 
          ["text", "content", "document", "description", "summary"].includes(String(h).toLowerCase())
        );
        if (textColMatch) {
          setSelectedVectorCols([textColMatch]);
        } else if (res.headers.length > 1) {
          setSelectedVectorCols([res.headers[1]]);
        } else if (res.headers.length > 0) {
          setSelectedVectorCols([res.headers[0]]);
        }
      }
    } catch (err) {
      console.error("Failed to parse headers", err);
      setExcelFile(null);
    } finally {
      setParsingHeaders(false);
    }
  };

  const handleAiSubmit = () => {
    const params = {
      provider,
      model: model || undefined,
      api_key: apiKey || undefined,
      azure_endpoint: azureEndpoint || undefined,
      azure_deployment: azureDeployment || undefined
    };

    if (activeTab === 0) {
      if (!documentsText.trim()) return;
      const documents = documentsText
        .split("\n")
        .map((d) => d.trim())
        .filter(Boolean);

      if (documents.length === 0) return;

      generateTextEmbeddings({
        ...params,
        documents
      });
    } else if (activeTab === 1) {
      if (!structuredText.trim()) return;
      
      // Basic format validation
      const lines = structuredText.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (!line.includes("-")) {
          alert(`Formatting error on line ${i + 1}: Line must contain a '-' separator between Number and Text.`);
          return;
        }
        const parts = line.split("-");
        if (!parts[0].trim() || !parts[1].trim()) {
          alert(`Formatting error on line ${i + 1}: Both Number and Text must be provided.`);
          return;
        }
      }

      generateTextEmbeddingsStructured({
        ...params,
        text_data: structuredText
      });
    } else if (activeTab === 2) {
      if (!excelFile) return;
      if (!selectedIdCol) {
        alert("Please select a Unique ID Column.");
        return;
      }
      if (selectedVectorCols.length === 0) {
        alert("Please select at least one Vector Column.");
        return;
      }

      const formData = new FormData();
      formData.append("file", excelFile);
      formData.append("provider", provider);
      if (model) formData.append("model", model);
      if (apiKey) formData.append("api_key", apiKey);
      if (azureEndpoint) formData.append("azure_endpoint", azureEndpoint);
      if (azureDeployment) formData.append("azure_deployment", azureDeployment);
      formData.append("id_column", selectedIdCol);
      formData.append("vector_columns", JSON.stringify(selectedVectorCols));

      generateFileEmbeddings(formData);
    }
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
              sx={{ minWidth: 90 }}
            >
              Clear
            </Button>
          )}
        </Box>
        {state.points.length > 0 && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<DownloadIcon />}
            onClick={downloadEmbeddingsCsv}
            size="small"
            fullWidth
            className="fade-in"
            sx={{
              borderColor: tokens.signal,
              color: tokens.signal,
              "&:hover": {
                borderColor: tokens.signal,
                backgroundColor: `${tokens.signal}10`
              }
            }}
          >
            Download CSV
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
                  } else if (val === "huggingface") {
                    setModel("sentence-transformers/all-MiniLM-L6-v2");
                  } else {
                    setModel("");
                  }
                }}
              >
                <MenuItem value="gemini">Gemini (Cloud API)</MenuItem>
                <MenuItem value="sentence-transformers">Sentence Transformers (Local)</MenuItem>
                <MenuItem value="openai">OpenAI (Cloud API)</MenuItem>
                <MenuItem value="azure">Azure OpenAI</MenuItem>
                <MenuItem value="huggingface">Hugging Face (Cloud API via LangChain)</MenuItem>
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
                  : provider === "openai"
                  ? "text-embedding-3-small"
                  : provider === "huggingface"
                  ? "sentence-transformers/all-MiniLM-L6-v2"
                  : "Model Name"
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

            {/* Ingestion Tabs */}
            <Tabs
              value={activeTab}
              onChange={(e, val) => setActiveTab(val)}
              variant="fullWidth"
              sx={{
                borderBottom: `1px solid ${tokens.border}`,
                mb: 0.5,
                minHeight: 36,
                "& .MuiTab-root": { py: 0.5, minHeight: 36, fontSize: "0.8rem" }
              }}
            >
              <Tab label="List" />
              <Tab label="Pasted Text" />
              <Tab label="Excel/CSV File" />
            </Tabs>

            {/* Tab Panels */}
            {activeTab === 0 && (
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
            )}

            {activeTab === 1 && (
              <TextField
                label="Structured entries (Number - Text)"
                value={structuredText}
                onChange={(e) => setStructuredText(e.target.value)}
                multiline
                rows={4}
                size="small"
                fullWidth
                placeholder={"1 - Database migration completed\n2 - Memory leak detected\n3 - Frontend bundle size optimization"}
              />
            )}

            {activeTab === 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box
                  sx={{
                    border: `1px dashed ${tokens.border}`,
                    borderRadius: 2,
                    p: 2,
                    textAlign: "center",
                    backgroundColor: tokens.bg,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: tokens.accent,
                      backgroundColor: `${tokens.accent}08`
                    }
                  }}
                  component="label"
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={handleExcelFileChange}
                    disabled={parsingHeaders}
                  />
                  <UploadIcon sx={{ fontSize: 24, color: tokens.textSecondary, mb: 0.5 }} />
                  <Typography variant="body2" sx={{ color: tokens.textPrimary, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {excelFile ? excelFile.name : "Select File (.xlsx, .csv)"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.textMuted, display: "block" }}>
                    {headers.length > 0 
                      ? `Mapped ${headers.length} columns from file`
                      : "Excel/CSV file with any headers"
                    }
                  </Typography>
                </Box>

                {parsingHeaders && (
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="caption" sx={{ color: tokens.signal, mb: 0.5, display: "block" }}>
                      Parsing column headers...
                    </Typography>
                    <LinearProgress color="secondary" />
                  </Box>
                )}

                {headers.length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 0.5 }} className="fade-in">
                    {/* Unique ID Column Select */}
                    <FormControl size="small" fullWidth>
                      <InputLabel id="id-column-label">Unique ID Column</InputLabel>
                      <Select
                        labelId="id-column-label"
                        value={selectedIdCol}
                        label="Unique ID Column"
                        onChange={(e) => setSelectedIdCol(e.target.value)}
                        sx={{ fontSize: "0.85rem" }}
                      >
                        {headers.map((h) => (
                          <MenuItem key={h} value={h} sx={{ fontSize: "0.85rem" }}>
                            {h}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Vector Columns Multi-Select */}
                    <FormControl size="small" fullWidth>
                      <InputLabel id="vector-columns-label">Vector Columns</InputLabel>
                      <Select
                        labelId="vector-columns-label"
                        multiple
                        value={selectedVectorCols}
                        label="Vector Columns"
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedVectorCols(typeof val === "string" ? val.split(",") : val);
                        }}
                        renderValue={(selected) => selected.join(", ")}
                        sx={{ fontSize: "0.85rem" }}
                      >
                        {headers.map((h) => (
                          <MenuItem key={h} value={h} sx={{ fontSize: "0.85rem" }}>
                            <Checkbox checked={selectedVectorCols.indexOf(h) > -1} size="small" sx={{ p: 0, mr: 1 }} />
                            <ListItemText primary={h} primaryTypographyProps={{ fontSize: "0.85rem" }} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}
              </Box>
            )}

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
              disabled={
                state.loading.embed ||
                (activeTab === 0 && !documentsText.trim()) ||
                (activeTab === 1 && !structuredText.trim()) ||
                (activeTab === 2 && (!excelFile || parsingHeaders || !selectedIdCol || selectedVectorCols.length === 0))
              }
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
