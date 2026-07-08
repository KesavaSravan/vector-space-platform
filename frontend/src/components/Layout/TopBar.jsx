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
  const { toggleDockLanding, setView } = useAppActions();

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
        {/* Brand/Logo & Guide Toggle Section */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
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

          <Button
            size="small"
            variant="outlined"
            onClick={toggleDockLanding}
            startIcon={<InfoIcon sx={{ fontSize: 14 }} />}
            sx={{
              fontSize: "0.75rem",
              py: 0.2,
              px: 1.5,
              height: 28,
              borderRadius: "6px",
              borderColor: state.dockLanding ? tokens.signal : tokens.border,
              color: state.dockLanding ? tokens.signal : tokens.textSecondary,
              backgroundColor: state.dockLanding ? `${tokens.signal}10` : "transparent",
              "&:hover": {
                borderColor: tokens.signal,
                color: tokens.signal
              }
            }}
          >
            {state.dockLanding ? "Hide Guide" : "Show Guide"}
          </Button>
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
