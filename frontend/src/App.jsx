import React from "react";
import { Box, Snackbar, Alert } from "@mui/material";
import TopBar from "./components/Layout/TopBar";
import Sidebar from "./components/Layout/Sidebar";
import Scene from "./components/Visualization/Scene";
import RightPanel from "./components/Layout/RightPanel";
import LandingPage from "./components/Landing/LandingPage";
import { AppProvider, useAppState, useAppActions } from "./context/AppContext";
import { tokens } from "./theme";

function Layout() {
  const state = useAppState();
  const { clearError, clearNotice } = useAppActions();

  const handleErrorClose = () => {
    clearError();
  };

  const handleNoticeClose = () => {
    clearNotice();
  };

  if (state.view === "landing") {
    return (
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: tokens.bg,
          color: tokens.textPrimary,
          overflow: "hidden"
        }}
      >
        <LandingPage />

        {/* Error notifications */}
        <Snackbar
          open={Boolean(state.error)}
          autoHideDuration={6000}
          onClose={handleErrorClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleErrorClose} severity="error" sx={{ width: "100%", borderRadius: 2 }}>
            {state.error}
          </Alert>
        </Snackbar>

        {/* Notice notifications */}
        <Snackbar
          open={Boolean(state.notice)}
          autoHideDuration={4000}
          onClose={handleNoticeClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleNoticeClose} severity="success" sx={{ width: "100%", borderRadius: 2 }}>
            {state.notice}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: tokens.bg,
        color: tokens.textPrimary,
        overflow: "hidden"
      }}
    >
      {/* 1. Top Navbar Header */}
      <TopBar />

      {/* 2. Main Content Grid split into Sidebar | Scene | RightPanel */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          position: "relative"
        }}
      >
        {/* Left Control Sidebar */}
        <Sidebar />

        {/* Dockable Workspace Guide (Landing Page) */}
        {state.dockLanding && (
          <Box
            sx={{
              width: 380,
              height: "100%",
              borderRight: `1px solid ${tokens.border}`,
              backgroundColor: tokens.surface,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <LandingPage isDocked={true} />
          </Box>
        )}

        {/* Center 3D viewport canvas */}
        <Box sx={{ flex: 1, height: "100%", position: "relative", overflow: "hidden" }}>
          <Scene />
        </Box>

        {/* Right Detail/Stats panel */}
        <RightPanel />
      </Box>

      {/* 3. Error notifications */}
      <Snackbar
        open={Boolean(state.error)}
        autoHideDuration={6000}
        onClose={handleErrorClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleErrorClose} severity="error" sx={{ width: "100%", borderRadius: 2 }}>
          {state.error}
        </Alert>
      </Snackbar>

      {/* 4. Notice notifications */}
      <Snackbar
        open={Boolean(state.notice)}
        autoHideDuration={4000}
        onClose={handleNoticeClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleNoticeClose} severity="success" sx={{ width: "100%", borderRadius: 2 }}>
          {state.notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  );
}
