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
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import {
  Send as SendIcon,
  DeleteOutline as DeleteIcon,
  Settings as SettingsIcon,
  SmartToy as RobotIcon,
  Person as UserIcon,
  Visibility as EyeIcon,
  VisibilityOff as EyeOffIcon
} from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

// Helper to render inline Markdown formatting (bold, italics, code, and clickable Ticket IDs)
function renderInlineFormattedText(text, onSelectTicket) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*|\b(?:INC|PRB|CHG|RITM)\d{5,8}\b)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} style={{ color: tokens.textPrimary, fontWeight: 700 }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          style={{
            backgroundColor: tokens.bg,
            border: `1px solid ${tokens.border}`,
            padding: "1px 4px",
            borderRadius: "3px",
            fontSize: "0.72rem",
            fontFamily: tokens.fontMono,
            color: tokens.signal
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} style={{ fontStyle: "italic", color: tokens.textSecondary }}>
          {token.slice(1, -1)}
        </em>
      );
    } else if (/^(INC|PRB|CHG|RITM)\d{5,8}$/.test(token)) {
      parts.push(
        <Chip
          key={match.index}
          label={token}
          size="small"
          onClick={() => onSelectTicket && onSelectTicket(token)}
          title={`Click to focus ticket ${token}`}
          sx={{
            height: 18,
            fontSize: "0.68rem",
            fontWeight: 700,
            fontFamily: tokens.fontMono,
            color: tokens.signal,
            backgroundColor: `${tokens.signal}18`,
            border: `1px solid ${tokens.signal}40`,
            cursor: "pointer",
            mx: 0.2,
            my: -0.2,
            verticalAlign: "middle",
            "&:hover": {
              backgroundColor: tokens.signal,
              color: tokens.bg
            }
          }}
        />
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return parts;
}

// Rich ServiceNow ITSM Markdown Renderer
function ServiceNowMarkdownRenderer({ content, onSelectTicket }) {
  if (!content) return null;

  const rawLines = content.split("\n");
  const blocks = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i].trim();

    // 1. Table Detection
    if (line.startsWith("|") && line.endsWith("|")) {
      const tableLines = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (l) =>
          l
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());

        const headers = parseRow(tableLines[0]);
        const isSeparator = (l) => /^\|(\s*:?-+:?\s*\|)+$/.test(l);
        const dataStart = isSeparator(tableLines[1]) ? 2 : 1;
        const rows = tableLines.slice(dataStart).map(parseRow);

        blocks.push(
          <TableContainer
            key={`table-${i}`}
            component={Paper}
            sx={{
              my: 1.5,
              backgroundColor: tokens.bg,
              border: `1px solid ${tokens.border}`,
              borderRadius: 1.5,
              overflowX: "auto",
              maxWidth: "100%",
              boxShadow: "none"
            }}
          >
            <Table size="small" sx={{ minWidth: 280 }}>
              <TableHead sx={{ backgroundColor: tokens.surface3 }}>
                <TableRow>
                  {headers.map((h, hIdx) => (
                    <TableCell
                      key={hIdx}
                      sx={{
                        py: 0.75,
                        px: 1,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: tokens.textPrimary,
                        borderColor: tokens.border,
                        whiteSpace: "nowrap"
                      }}
                    >
                      {renderInlineFormattedText(h, onSelectTicket)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, rIdx) => (
                  <TableRow key={rIdx} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    {row.map((cell, cIdx) => (
                      <TableCell
                        key={cIdx}
                        sx={{
                          py: 0.6,
                          px: 1,
                          fontSize: "0.72rem",
                          color: tokens.textSecondary,
                          borderColor: tokens.border,
                          wordBreak: "break-word"
                        }}
                      >
                        {renderInlineFormattedText(cell, onSelectTicket)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
        continue;
      }
    }

    // 2. Horizontal Divider
    if (line === "---" || line === "***" || line === "___") {
      blocks.push(<Divider key={`hr-${i}`} sx={{ my: 1.5, borderColor: `${tokens.border}` }} />);
      i++;
      continue;
    }

    // 3. Headings
    if (line.startsWith("### ")) {
      blocks.push(
        <Typography
          key={`h3-${i}`}
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: tokens.signal,
            mt: 1.5,
            mb: 0.5,
            fontSize: "0.85rem",
            letterSpacing: "0.2px"
          }}
        >
          {renderInlineFormattedText(line.replace(/^###\s+/, ""), onSelectTicket)}
        </Typography>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <Typography
          key={`h2-${i}`}
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: tokens.textPrimary,
            mt: 1.5,
            mb: 0.5,
            fontSize: "0.9rem"
          }}
        >
          {renderInlineFormattedText(line.replace(/^##\s+/, ""), onSelectTicket)}
        </Typography>
      );
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <Typography
          key={`h1-${i}`}
          variant="h6"
          sx={{
            fontWeight: 800,
            color: tokens.textPrimary,
            mt: 1.5,
            mb: 0.5,
            fontSize: "1rem"
          }}
        >
          {renderInlineFormattedText(line.replace(/^#\s+/, ""), onSelectTicket)}
        </Typography>
      );
      i++;
      continue;
    }

    // 4. Bullet list items (* or -)
    if (line.startsWith("* ") || line.startsWith("- ")) {
      blocks.push(
        <Box key={`bullet-${i}`} sx={{ display: "flex", gap: 1, my: 0.4, pl: 0.5 }}>
          <Typography sx={{ color: tokens.signal, fontSize: "0.75rem", lineHeight: 1.5, userSelect: "none" }}>
            •
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.textPrimary, fontSize: "0.78rem", lineHeight: 1.5, wordBreak: "break-word" }}>
            {renderInlineFormattedText(line.replace(/^[\*\-]\s+/, ""), onSelectTicket)}
          </Typography>
        </Box>
      );
      i++;
      continue;
    }

    // 5. Numbered list items (e.g. 1. , 2. )
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push(
        <Box key={`num-${i}`} sx={{ display: "flex", gap: 1, my: 0.5, pl: 0.5 }}>
          <Typography
            className="font-mono"
            sx={{
              color: tokens.accent,
              fontWeight: 700,
              fontSize: "0.75rem",
              lineHeight: 1.5,
              minWidth: 16
            }}
          >
            {numMatch[1]}.
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.textPrimary, fontSize: "0.78rem", lineHeight: 1.5, wordBreak: "break-word" }}>
            {renderInlineFormattedText(numMatch[2], onSelectTicket)}
          </Typography>
        </Box>
      );
      i++;
      continue;
    }

    // 6. Regular Paragraph or blank line
    if (line) {
      blocks.push(
        <Typography
          key={`p-${i}`}
          variant="body2"
          sx={{
            color: tokens.textPrimary,
            fontSize: "0.78rem",
            lineHeight: 1.55,
            my: 0.3,
            wordBreak: "break-word",
            overflowWrap: "anywhere"
          }}
        >
          {renderInlineFormattedText(line, onSelectTicket)}
        </Typography>
      );
    }
    i++;
  }

  return <Box sx={{ width: "100%", overflowX: "hidden" }}>{blocks}</Box>;
}

export default function AIChatPanel() {
  const state = useAppState();
  const { 
    sendChatMessage, 
    clearChat, 
    updateChatSettings, 
    selectVector, 
    setNotice 
  } = useAppActions();

  const { chatMessages, chatLoading, chatSettings } = state;
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
      defModel = "openai/gpt-oss-120b";
    }
    updateChatSettings({ provider: prov, model: defModel });
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
  const predefinedGroq = ["openai/gpt-oss-120b", "mixtral-8x7b-32768", "gemma2-9b-it"];

  const isPredefined =
    chatSettings.provider === "gemini"
      ? predefinedGemini.includes(chatSettings.model)
      : predefinedGroq.includes(chatSettings.model);

  const selectValue = isPredefined ? chatSettings.model : "custom";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}
    >
      {/* 1. Header controls */}
      <Box
        sx={{
          borderBottom: `1px solid ${tokens.border}`,
          pb: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ color: tokens.textPrimary, fontWeight: 700 }}>
            ServiceNow AI Copilot
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textMuted }}>
            ITSM RAG Resolution Assistant ({chatSettings.provider === "groq" ? "GPT-OSS 120B" : "Gemini"})
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => setShowSettings(!showSettings)}
            sx={{ color: showSettings ? tokens.signal : tokens.textSecondary }}
            title="Configure LLM & RAG Settings"
          >
            <SettingsIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {chatMessages.length > 0 && (
            <IconButton
              size="small"
              onClick={handleClear}
              sx={{ color: tokens.textSecondary, "&:hover": { color: "#FF3B30" } }}
              title="Clear Chat History"
            >
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
            gap: 1.25
          }}
        >
          {/* Provider & Model dropdowns side-by-side */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Provider</InputLabel>
              <Select value={chatSettings.provider} label="Provider" onChange={handleProviderChange}>
                <MenuItem value="groq">Groq (GPT-OSS 120B)</MenuItem>
                <MenuItem value="gemini">Gemini</MenuItem>
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
                    const defaultCustom =
                      chatSettings.provider === "gemini" ? "gemini-2.0-flash" : "openai/gpt-oss-120b";
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
                  <MenuItem key="openai/gpt-oss-120b" value="openai/gpt-oss-120b">openai/gpt-oss-120b</MenuItem>,
                  <MenuItem key="mixtral-8x7b-32768" value="mixtral-8x7b-32768">mixtral-8x7b-32768</MenuItem>,
                  <MenuItem key="gemma2-9b-it" value="gemma2-9b-it">gemma2-9b-it</MenuItem>,
                  <MenuItem key="custom-groq" value="custom">Custom...</MenuItem>
                ]}
              </Select>
            </FormControl>
          </Box>

          {!isPredefined && (
            <TextField
              label="Custom Model Name"
              value={chatSettings.model}
              onChange={(e) => updateChatSettings({ model: e.target.value })}
              size="small"
              fullWidth
              placeholder={chatSettings.provider === "gemini" ? "e.g. gemini-2.0-flash" : "e.g. openai/gpt-oss-120b"}
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
                Enable RAG (Search ServiceNow Tickets)
              </Typography>
            }
            sx={{ m: 0 }}
          />

          {/* RAG Top K Slider */}
          {chatSettings.useRag && (
            <Box sx={{ px: 1, mt: -0.5 }}>
              <Typography variant="caption" sx={{ color: tokens.textSecondary, display: "block", mb: 0.5 }}>
                Context Limit: top {chatSettings.topK} similar tickets
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

      {/* 2. Messages Window */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          my: 0.5,
          pr: 0.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          minHeight: 0
        }}
        className="scrollable-panel"
      >
        {chatMessages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              gap: 1.5,
              px: 2
            }}
          >
            <RobotIcon sx={{ fontSize: 44, color: tokens.textMuted }} />
            <Typography variant="subtitle2" sx={{ color: tokens.textPrimary, fontWeight: 700 }}>
              ServiceNow ITSM Assistant Ready
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: "0.78rem", lineHeight: 1.5 }}>
              Ask me about recurring incidents, root-cause patterns, or recommended resolution steps. Enable <strong>RAG</strong> to search your active ServiceNow dataset directly.
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
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box"
                }}
              >
                {/* Profile Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5, px: 0.5 }}>
                  {isUser ? (
                    <>
                      <Typography variant="caption" sx={{ color: tokens.textMuted, fontSize: "0.68rem" }}>
                        User
                      </Typography>
                      <UserIcon sx={{ fontSize: 12, color: tokens.textMuted }} />
                    </>
                  ) : (
                    <>
                      <RobotIcon sx={{ fontSize: 12, color: tokens.signal }} />
                      <Typography variant="caption" sx={{ color: tokens.signal, fontSize: "0.68rem", fontWeight: 700 }}>
                        ServiceNow Copilot ({chatSettings.provider === "groq" ? "GPT-OSS 120B" : "Gemini"})
                      </Typography>
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
                    borderWidth: 1,
                    borderStyle: "solid",
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    overflowX: "hidden",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere"
                  }}
                >
                  {isUser ? (
                    <Typography variant="body2" sx={{ color: tokens.textPrimary, whiteSpace: "pre-wrap", fontSize: "0.8rem", lineHeight: 1.5 }}>
                      {msg.content}
                    </Typography>
                  ) : (
                    <ServiceNowMarkdownRenderer content={msg.content} onSelectTicket={selectVector} />
                  )}

                  {/* Context references chips */}
                  {!isUser && msg.context_nodes && msg.context_nodes.length > 0 && (
                    <Box sx={{ mt: 1.5, borderTop: `1px solid ${tokens.border}`, pt: 1 }}>
                      <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 700, display: "block", mb: 0.5, fontSize: "0.68rem" }}>
                        Referenced ServiceNow Tickets (Click to highlight in 3D):
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
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              fontFamily: tokens.fontMono,
                              borderColor: tokens.border,
                              color: tokens.signal,
                              backgroundColor: tokens.bg,
                              cursor: "pointer",
                              "&:hover": {
                                borderColor: tokens.signal,
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
          <Box sx={{ display: "flex", flexDirection: "column", alignSelf: "flex-start", width: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5, px: 0.5 }}>
              <RobotIcon sx={{ fontSize: 12, color: tokens.signal }} />
              <Typography variant="caption" sx={{ color: tokens.signal, fontSize: "0.68rem", fontWeight: 700 }}>
                ServiceNow Copilot
              </Typography>
            </Box>
            <Paper sx={{ p: 1.5, borderRadius: "12px 12px 12px 2px", backgroundColor: tokens.surface2, borderColor: tokens.border, borderWidth: 1, borderStyle: "solid" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <CircularProgress size={14} color="secondary" />
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                  Analyzing ServiceNow ticket vector space & retrieving root causes...
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        <div ref={chatEndRef} />
      </Box>

      {/* 3. Text input box */}
      <Box sx={{ display: "flex", gap: 1, borderTop: `1px solid ${tokens.border}`, pt: 1 }}>
        <TextField
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask ServiceNow Copilot (e.g. 'What is the root cause of VPN issues?')..."
          size="small"
          fullWidth
          multiline
          maxRows={3}
          onKeyDown={handleKeyPress}
          disabled={chatLoading}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: tokens.bg,
              fontSize: "0.8rem",
              p: 1
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
            width: 38,
            height: 38,
            alignSelf: "flex-end",
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
            The loaded dataset was created using the <strong>{datasetProvider}</strong> provider with the model{" "}
            <strong>{datasetModel}</strong>. To generate query embeddings for RAG retrieval, please enter your API key
            for this provider.
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
