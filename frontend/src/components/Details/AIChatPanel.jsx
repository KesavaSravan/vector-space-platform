import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Slider,
  IconButton,
  Collapse,
  Divider,
  Chip,
  Paper,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@mui/material";
import {
  Send as SendIcon,
  DeleteOutline as DeleteIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  SmartToy as RobotIcon,
  Person as UserIcon,
  InfoOutlined as InfoIcon,
  Visibility as EyeIcon,
  VisibilityOff as EyeOffIcon
} from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function AIChatPanel() {
  const state = useAppState();
  const { 
    sendChatMessage, 
    clearChat, 
    updateChatSettings,
    selectVector,
    setNotice
  } = useAppActions();

  const { chatMessages, chatLoading, chatSettings, chatReferences } = state;
  const [inputText, setInputText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Dialog state for RAG key prompting
  const [openKeyDialog, setOpenKeyDialog] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  
  const datasetProvider = state.statistics?.embedding_provider;
  const datasetModel = state.statistics?.embedding_model;
  const providerRequiresKey = ["gemini", "openai", "huggingface"].includes(datasetProvider?.toLowerCase());
  
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleSend = () => {
    if (!inputText.trim() || chatLoading) return;
    
    // Prompt for Embedding API Key if RAG is enabled and key is missing
    if (chatSettings.useRag && providerRequiresKey && !chatSettings.embeddingApiKey?.trim()) {
      setPendingMessage(inputText);
      setKeyInput("");
      setOpenKeyDialog(true);
      return;
    }
    
    sendChatMessage(inputText);
    setInputText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleProviderChange = (e) => {
    const prov = e.target.value;
    let defModel = "gemini-2.5-flash";
    if (prov === "groq") {
      defModel = "llama-3.3-70b-versatile";
    }
    updateChatSettings({ provider: prov, model: defModel });
  };

  const handleModelChange = (e) => {
    updateChatSettings({ model: e.target.value });
  };

  const handleApiKeyChange = (e) => {
    if (chatSettings.provider === "gemini") {
      updateChatSettings({ apiKey: e.target.value });
    } else {
      updateChatSettings({ groqKey: e.target.value });
    }
  };

  const handleRagToggle = (e) => {
    const checked = e.target.checked;
    updateChatSettings({ useRag: checked });
    
    if (checked && providerRequiresKey && !chatSettings.embeddingApiKey?.trim()) {
      setPendingMessage("");
      setKeyInput("");
      setOpenKeyDialog(true);
    }
  };

  const handleTopKChange = (e, val) => {
    updateChatSettings({ topK: val });
  };

  const handleClear = () => {
    clearChat();
    setNotice("Chat history cleared.");
  };

  const currentKeyVal = chatSettings.provider === "gemini" ? chatSettings.apiKey : chatSettings.groqKey;

  const predefinedGemini = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  const predefinedGroq = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"];
  
  const isPredefined = chatSettings.provider === "gemini" 
    ? predefinedGemini.includes(chatSettings.model) 
    : predefinedGroq.includes(chatSettings.model);

  const selectValue = isPredefined ? chatSettings.model : "custom";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", overflow: "hidden" }}>
      {/* 1. Header controls */}
      <Box sx={{ borderBottom: `1px solid ${tokens.border}`, pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: tokens.textPrimary, fontWeight: 700 }}>
            AI Assistant Chatbot
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textMuted }}>
            {chatSettings.provider === "gemini" ? "Gemini" : "Groq Llama 3.3"} RAG Chat
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <IconButton 
            size="small" 
            onClick={() => setShowSettings(!showSettings)} 
            sx={{ 
              color: showSettings ? tokens.signal : tokens.textSecondary,
              "&:hover": { color: tokens.signal } 
            }}
            title="Configure Chat & RAG Settings"
          >
            <SettingsIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {chatMessages.length > 0 && (
            <IconButton size="small" onClick={handleClear} sx={{ color: tokens.textSecondary, "&:hover": { color: "#FF3B30" } }}>
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Configuration Controls (Collapsible) */}
      <Collapse in={showSettings}>
        <Paper 
          sx={{ 
            p: 1.5, 
            mb: 1.5, 
            backgroundColor: tokens.surface2, 
            borderColor: tokens.border,
            display: "flex",
            flexDirection: "column",
            gap: 1.5
          }}
        >
          {/* Provider & Model dropdowns side-by-side */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Provider</InputLabel>
              <Select
                value={chatSettings.provider}
                label="Provider"
                onChange={handleProviderChange}
              >
                <MenuItem value="gemini">Gemini</MenuItem>
                <MenuItem value="groq">Groq</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Model</InputLabel>
              <Select
                value={selectValue}
                label="Model"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "custom") {
                    const defaultCustom = chatSettings.provider === "gemini" ? "gemini-2.0-flash" : "llama-3.1-8b-instant";
                    updateChatSettings({ model: defaultCustom });
                  } else {
                    updateChatSettings({ model: val });
                  }
                }}
              >
                {chatSettings.provider === "gemini" ? [
                  <MenuItem key="gemini-2.5-flash" value="gemini-2.5-flash">gemini-2.5-flash</MenuItem>,
                  <MenuItem key="gemini-1.5-flash" value="gemini-1.5-flash">gemini-1.5-flash</MenuItem>,
                  <MenuItem key="gemini-1.5-pro" value="gemini-1.5-pro">gemini-1.5-pro</MenuItem>,
                  <MenuItem key="custom-gemini" value="custom">Custom...</MenuItem>
                ] : [
                  <MenuItem key="llama-3.3-70b-versatile" value="llama-3.3-70b-versatile">Llama 3.3</MenuItem>,
                  <MenuItem key="mixtral-8x7b-32768" value="mixtral-8x7b-32768">Mixtral</MenuItem>,
                  <MenuItem key="gemma2-9b-it" value="gemma2-9b-it">Gemma 2</MenuItem>,
                  <MenuItem key="custom-groq" value="custom">Custom...</MenuItem>
                ]}
              </Select>
            </FormControl>
          </Box>

          {/* Custom model name text field - shown if not predefined */}
          {!isPredefined && (
            <TextField
              label="Custom Model Name"
              value={chatSettings.model}
              onChange={(e) => updateChatSettings({ model: e.target.value })}
              size="small"
              fullWidth
              placeholder={chatSettings.provider === "gemini" ? "e.g. gemini-2.0-flash" : "e.g. llama-3.1-8b-instant"}
            />
          )}

          {/* API Key */}
          <TextField
            label={chatSettings.provider === "gemini" ? "Gemini API Key" : "Groq API Key"}
            placeholder="Override server key (optional)"
            value={currentKeyVal}
            onChange={handleApiKeyChange}
            type={showApiKey ? "text" : "password"}
            size="small"
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end" size="small">
                      {showApiKey ? <EyeOffIcon sx={{ fontSize: 16 }} /> : <EyeIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          {/* Embedding API Key (RAG specific) */}
          {chatSettings.useRag && providerRequiresKey && (
            <TextField
              label={`Embedding API Key (${datasetProvider?.toUpperCase()})`}
              placeholder="Required for query embedding"
              value={chatSettings.embeddingApiKey || ""}
              onChange={(e) => updateChatSettings({ embeddingApiKey: e.target.value })}
              type="password"
              size="small"
              fullWidth
              required
              error={!chatSettings.embeddingApiKey?.trim()}
              helperText={!chatSettings.embeddingApiKey?.trim() ? `Required to embed query using ${datasetModel}` : ""}
            />
          )}
          {/* RAG Toggle */}
          <FormControlLabel
            control={
              <Checkbox
                checked={chatSettings.useRag}
                onChange={handleRagToggle}
                size="small"
                color="secondary"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Enable RAG (Search Vector Space)
              </Typography>
            }
            sx={{ m: 0 }}
          />

          {/* RAG Top K Slider */}
          {chatSettings.useRag && (
            <Box sx={{ px: 1, mt: -0.5 }}>
              <Typography variant="caption" sx={{ color: tokens.textSecondary, display: "block", mb: 0.5 }}>
                Context Limit: top {chatSettings.topK} similar nodes
              </Typography>
              <Slider
                value={chatSettings.topK}
                onChange={handleTopKChange}
                min={1}
                max={20}
                step={1}
                marks
                valueLabelDisplay="auto"
                color="secondary"
                size="small"
              />
            </Box>
          )}
        </Paper>
      </Collapse>

      <Divider sx={{ mb: 1 }} />

      {/* 3. Messages Window */}
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: "auto", 
          my: 1, 
          pr: 0.5,
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}
        className="scrollable-panel"
      >
        {chatMessages.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70%", textAlign: "center", gap: 1.5, px: 2 }}>
            <RobotIcon sx={{ fontSize: 40, color: tokens.textMuted }} />
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              Ask me anything about your vector space! Try activating "Enable RAG" in settings to let me retrieve matching documents directly.
            </Typography>
          </Box>
        ) : (
          chatMessages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <Box 
                key={index} 
                sx={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: isUser ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                  alignSelf: isUser ? "flex-end" : "flex-start"
                }}
              >
                {/* Profile Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5, px: 0.5 }}>
                  {isUser ? (
                    <>
                      <Typography variant="caption" sx={{ color: tokens.textMuted, fontSize: "0.68rem" }}>User</Typography>
                      <UserIcon sx={{ fontSize: 12, color: tokens.textMuted }} />
                    </>
                  ) : (
                    <>
                      <RobotIcon sx={{ fontSize: 12, color: tokens.signal }} />
                      <Typography variant="caption" sx={{ color: tokens.signal, fontSize: "0.68rem", fontWeight: 600 }}>Assistant</Typography>
                    </>
                  )}
                </Box>

                {/* Message bubble */}
                <Paper 
                  sx={{ 
                    p: 1.5, 
                    borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    backgroundColor: isUser ? `${tokens.accent}1c` : tokens.surface2,
                    borderColor: isUser ? tokens.accent : tokens.border,
                    borderWidth: isUser ? 1 : 1
                  }}
                >
                  <Typography variant="body2" sx={{ color: tokens.textPrimary, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {msg.content}
                  </Typography>

                  {/* Context references chips */}
                  {!isUser && msg.context_nodes && msg.context_nodes.length > 0 && (
                    <Box sx={{ mt: 1.5, borderTop: `1px solid ${tokens.border}`, pt: 1 }}>
                      <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 600, display: "block", mb: 0.5 }}>
                        Context References (Click to select node):
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {msg.context_nodes.map((node, nIdx) => (
                          <Chip
                            key={node.id}
                            label={`[${nIdx + 1}] ${node.id}`}
                            size="small"
                            variant="outlined"
                            onClick={() => selectVector(node.id)}
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              borderColor: tokens.border,
                              color: tokens.textSecondary,
                              backgroundColor: tokens.bg,
                              cursor: "pointer",
                              "&:hover": {
                                borderColor: tokens.signal,
                                color: tokens.textPrimary,
                                backgroundColor: tokens.surface3
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Box>
            );
          })
        )}

        {/* Typing loading indicator */}
        {chatLoading && (
          <Box sx={{ display: "flex", flexDirection: "column", alignSelf: "flex-start", maxWidth: "92%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5, px: 0.5 }}>
              <RobotIcon sx={{ fontSize: 12, color: tokens.signal }} />
              <Typography variant="caption" sx={{ color: tokens.signal, fontSize: "0.68rem", fontWeight: 600 }}>Assistant</Typography>
            </Box>
            <Paper sx={{ p: 1.5, borderRadius: "12px 12px 12px 2px", backgroundColor: tokens.surface2, borderColor: tokens.border }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <CircularProgress size={12} color="secondary" />
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                  Analyzing vector space...
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        <div ref={chatEndRef} />
      </Box>

      {/* 4. Text input box */}
      <Box sx={{ display: "flex", gap: 1, borderTop: `1px solid ${tokens.border}`, pt: 1 }}>
        <TextField
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask AI Assistant..."
          size="small"
          fullWidth
          multiline
          maxRows={2}
          onKeyDown={handleKeyPress}
          disabled={chatLoading}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: tokens.bg,
              fontSize: "0.85rem"
            }
          }}
        />
        <IconButton 
          onClick={handleSend}
          disabled={!inputText.trim() || chatLoading}
          color="secondary"
          sx={{ 
            backgroundColor: inputText.trim() && !chatLoading ? tokens.signal : "transparent",
            color: inputText.trim() && !chatLoading ? tokens.bg : tokens.textMuted,
            width: 40,
            height: 40,
            "&:hover": {
              backgroundColor: inputText.trim() && !chatLoading ? "#00C7AD" : "transparent"
            }
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
      {/* API Key Modal Dialog for RAG Embedding Provider */}
      <Dialog 
        open={openKeyDialog} 
        onClose={() => setOpenKeyDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: tokens.surface2,
            borderColor: tokens.border,
            borderWidth: 1,
            borderStyle: "solid",
            color: tokens.textPrimary
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Enter API Key for {datasetProvider ? datasetProvider.toUpperCase() : ""}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: tokens.textMuted, mb: 2, fontSize: 13 }}>
            The loaded dataset was created using the <strong>{datasetProvider}</strong> provider with the model <strong>{datasetModel}</strong>.
            To generate query embeddings for RAG retrieval, please enter your API key for this provider. 
            This key will be used <strong>only</strong> for search query vectorization.
          </DialogContentText>
          <TextField
            autoFocus
            label={`${datasetProvider ? datasetProvider.charAt(0).toUpperCase() + datasetProvider.slice(1) : ""} API Key`}
            type="password"
            fullWidth
            size="small"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Enter key here"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenKeyDialog(false)} sx={{ color: tokens.textSecondary }}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (!keyInput.trim()) return;
              updateChatSettings({ embeddingApiKey: keyInput.trim() });
              setOpenKeyDialog(false);
              if (pendingMessage) {
                sendChatMessage(pendingMessage);
                setInputText("");
                setPendingMessage("");
              }
            }} 
            variant="contained" 
            color="secondary"
            disabled={!keyInput.trim()}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
