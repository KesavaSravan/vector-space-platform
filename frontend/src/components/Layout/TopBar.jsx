import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Chip,
  LinearProgress,
  CircularProgress,
  Button
} from "@mui/material";
import {
  Troubleshoot as DiagnosticIcon,
  Timeline as TimelineIcon,
  HelpOutline as InfoIcon,
  Home as HomeIcon,
  Troubleshoot as PlatformIcon
} from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function TopBar() {
  const state = useAppState();
  const { setMode, setView } = useAppActions();

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  // Determine if backend is loading any action
  const isLoading = Object.values(state.loading).some(Boolean);

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: tokens.surface,
        borderBottom: `1px solid ${tokens.border}`,
        boxShadow: "none",
        zIndex: 1201,
        height: 56
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          height: 56,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: "16px !important"
        }}
      >
        {/* Brand/Logo Section */}
        <Box 
          sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }}
          onClick={() => setView("landing")}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              background: `linear-gradient(135deg, ${tokens.accent} 0%, ${tokens.signal} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 12px ${tokens.accent}40`
            }}
          >
            <PlatformIcon sx={{ fontSize: 18, color: tokens.bg }} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              className="font-display"
              sx={{
                fontWeight: 700,
                letterSpacing: "0.5px",
                background: `linear-gradient(90deg, ${tokens.textPrimary} 0%, ${tokens.textSecondary} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              VECTOR SPACE PLATFORM
            </Typography>
          </Box>
        </Box>

        {/* Mode Selector */}
        <Box>
          <ToggleButtonGroup
            value={state.mode}
            exclusive
            onChange={handleModeChange}
            size="small"
            sx={{
              backgroundColor: tokens.bg,
              border: `1px solid ${tokens.border}`,
              "& .MuiToggleButtonGroup-grouped": {
                border: 0,
                px: 2,
                py: 0.5,
                borderRadius: "6px",
                color: tokens.textSecondary,
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 600,
                fontSize: "0.75rem",
                "&.Mui-selected": {
                  backgroundColor: tokens.surface3,
                  color: tokens.signal,
                  "&:hover": {
                    backgroundColor: tokens.surface3
                  }
                }
              }
            }}
          >
            <ToggleButton value="general">
              General Mode
            </ToggleButton>
            <ToggleButton value="alert" sx={{ display: "flex", gap: 0.5 }}>
              <DiagnosticIcon sx={{ fontSize: 14 }} /> Alert Intel
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Live stats chips */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {isLoading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ color: tokens.signal, fontFamily: tokens.fontMono }}>
                PROCESSING
              </Typography>
              <CircularProgress size={12} color="secondary" thickness={6} />
            </Box>
          )}

          {state.totalVectors > 0 && (
            <>
              <Chip
                label={`${state.totalVectors} Vectors`}
                size="small"
                variant="outlined"
                className="font-mono"
                sx={{
                  height: 24,
                  borderColor: tokens.border,
                  backgroundColor: tokens.bg,
                  color: tokens.textPrimary,
                  fontSize: "0.75rem"
                }}
              />
              <Chip
                label={`${state.dimension}-D Space`}
                size="small"
                variant="outlined"
                className="font-mono"
                sx={{
                  height: 24,
                  borderColor: tokens.border,
                  backgroundColor: tokens.bg,
                  color: tokens.textPrimary,
                  fontSize: "0.75rem"
                }}
              />
              <Chip
                label={`${state.algo.reductionMethod.toUpperCase()} ${state.algo.nComponents}D`}
                size="small"
                variant="outlined"
                className="font-mono"
                sx={{
                  height: 24,
                  borderColor: tokens.border,
                  backgroundColor: tokens.bg,
                  color: tokens.signal,
                  fontSize: "0.75rem"
                }}
              />
            </>
          )}

          {/* Home Button aligned to far right */}
          <Button
            size="small"
            variant="text"
            startIcon={<HomeIcon sx={{ fontSize: 14 }} />}
            onClick={() => setView("landing")}
            sx={{
              color: tokens.textSecondary,
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              fontSize: "0.72rem",
              textTransform: "none",
              borderRadius: "6px",
              py: 0.4,
              px: 1.2,
              border: `1px solid ${tokens.border}`,
              backgroundColor: tokens.bg,
              "&:hover": {
                color: tokens.textPrimary,
                borderColor: tokens.accent,
                backgroundColor: tokens.surface3
              }
            }}
          >
            Home
          </Button>
        </Box>
      </Toolbar>

      {/* Full width progress bar below Navbar */}
      {isLoading && (
        <LinearProgress
          color="secondary"
          sx={{
            height: 2,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0
          }}
        />
      )}
    </AppBar>
  );
}
