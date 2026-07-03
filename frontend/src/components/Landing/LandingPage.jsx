import React from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Divider
} from "@mui/material";
import {
  PlayArrow as LaunchIcon,
  CloudUpload as IngestIcon,
  Hub as ConnectionIcon,
  ScatterPlot as ProjectionIcon,
  Grain as ClusterIcon,
  Search as SearchIcon,
  QueryStats as AnalyticsIcon,
  Troubleshoot as PlatformIcon
} from "@mui/icons-material";
import { useAppActions } from "../../context/AppContext";
import { tokens } from "../../theme";

export default function LandingPage() {
  const { setView } = useAppActions();

  const handleLaunch = () => {
    setView("app");
  };

  const features = [
    {
      icon: <IngestIcon sx={{ fontSize: 32, color: tokens.signal }} />,
      title: "Structured Data Ingestion",
      description: "Supports simple document lists, pasted 'Number - Text' rows, and standard Excel or CSV file uploads. All generated coordinates are downloadable as ordered CSVs."
    },
    {
      icon: <ConnectionIcon sx={{ fontSize: 32, color: tokens.accent }} />,
      title: "Multi-Provider AI Embeddings",
      description: "Integrates with Google Gemini, Hugging Face Hub (via LangChain), OpenAI, Azure, and local Sentence-Transformers. Fully lazy-loaded to optimize memory."
    },
    {
      icon: <ProjectionIcon sx={{ fontSize: 32, color: tokens.signal }} />,
      title: "Dimensionality Projection",
      description: "Applies mathematical scaling and projects high-dimensional embeddings into a visual 3D space using PCA, t-SNE, or UMAP algorithms."
    },
    {
      icon: <ClusterIcon sx={{ fontSize: 32, color: tokens.accent }} />,
      title: "Unsupervised Clustering",
      description: "Partitions vectors using K-Means or identifies dense patterns using DBSCAN, auto-marking outliers and coloring point clusters dynamically."
    },
    {
      icon: <SearchIcon sx={{ fontSize: 32, color: tokens.signal }} />,
      title: "Spatial Similarity Search",
      description: "Pinpoint nearest neighbors inside the 3D void using Cosine Similarity or Euclidean Distance. Filter results by similarity thresholds."
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 32, color: tokens.accent }} />,
      title: "Deep Workspace Analytics",
      description: "Calculates statistics for outliers, cluster distribution spreads, and severity weights. Explored details are shown in an interactive side drawer."
    }
  ];

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: tokens.bg,
        color: tokens.textPrimary,
        overflowY: "auto",
        pb: 8
      }}
    >
      {/* Sleek Landing Header */}
      <Box
        sx={{
          borderBottom: `1px solid ${tokens.border}`,
          backdropFilter: "blur(12px)",
          backgroundColor: `${tokens.surface}d0`,
          position: "sticky",
          top: 0,
          zIndex: 10,
          py: 1.5
        }}
      >
        <Container maxWidth="lg" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
              variant="h6"
              className="font-display"
              sx={{
                fontWeight: 700,
                fontSize: "1.1rem",
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
            variant="contained"
            color="secondary"
            endIcon={<LaunchIcon />}
            onClick={handleLaunch}
            sx={{ px: 3 }}
          >
            Launch Visualizer
          </Button>
        </Container>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 6, md: 8 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 0.5,
                  borderRadius: "20px",
                  border: `1px solid ${tokens.accent}30`,
                  backgroundColor: `${tokens.accent}08`,
                  width: "fit-content"
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: tokens.signal }} />
                <Typography variant="caption" className="font-mono" sx={{ color: tokens.signal, letterSpacing: "1px" }}>
                  VERSION 1.0.0 ACTIVE
                </Typography>
              </Box>

              <Typography
                variant="h2"
                className="font-display"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "2.5rem", md: "3.5rem" },
                  lineHeight: 1.15,
                  background: `linear-gradient(135deg, ${tokens.textPrimary} 30%, ${tokens.textSecondary} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                Navigate the N-Dimensional Void
              </Typography>

              <Typography variant="body1" sx={{ color: tokens.textSecondary, fontSize: "1.1rem", lineHeight: 1.6 }}>
                Visualize, cluster, and analyze high-dimensional vector spaces interactively. Ingest raw logs or spreadsheet files, compute embeddings instantly with top-tier AI models, and explore the mathematical clusters in 3D.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleLaunch}
                  endIcon={<LaunchIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: "0.95rem",
                    boxShadow: `0 8px 24px ${tokens.accent}30`
                  }}
                >
                  Enter Workspace
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="#features"
                  sx={{
                    px: 3.5,
                    py: 1.5,
                    borderColor: tokens.border,
                    color: tokens.textSecondary,
                    "&:hover": {
                      borderColor: tokens.accent,
                      color: tokens.textPrimary
                    }
                  }}
                >
                  Learn More
                </Button>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                borderRadius: 4,
                overflow: "hidden",
                border: `1px solid ${tokens.border}`,
                boxShadow: `0 20px 40px rgba(0,0,0,0.6)`,
                transition: "transform 0.5s ease-out",
                "&:hover": {
                  transform: "scale(1.02)"
                }
              }}
            >
              <Box
                component="img"
                src="/vector_space_hero.png"
                alt="3D Vector Space Representation"
                sx={{
                  width: "100%",
                  height: "auto",
                  display: "block"
                }}
              />
              {/* Decorative Glow */}
              <Box
                sx={{
                  position: "absolute",
                  top: "-10%",
                  right: "-10%",
                  width: "40%",
                  height: "40%",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${tokens.signal}20 0%, transparent 70%)`,
                  filter: "blur(40px)"
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: "-10%",
                  left: "-10%",
                  width: "40%",
                  height: "40%",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${tokens.accent}20 0%, transparent 70%)`,
                  filter: "blur(40px)"
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Features Grid Section */}
      <Box
        id="features"
        sx={{
          backgroundColor: tokens.surface,
          borderTop: `1px solid ${tokens.border}`,
          borderBottom: `1px solid ${tokens.border}`,
          py: 10
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <Typography variant="h3" className="font-display" sx={{ fontWeight: 700, mb: 2 }}>
              Explore Platform Capabilities
            </Typography>
            <Typography variant="body1" sx={{ color: tokens.textSecondary, maxWidth: 600, mx: "auto" }}>
              Our platform orchestrates a mathematical pipeline designed to convert raw content into spatial data you can browse, cluster, and export.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {features.map((feature, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx} className="fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                <Card
                  className="glass-panel"
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: "pointer",
                    "&:hover": {
                      borderColor: tokens.accent,
                      transform: "translateY(-6px)",
                      boxShadow: `0 12px 24px rgba(0,0,0,0.5)`
                    }
                  }}
                >
                  <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: "12px",
                        backgroundColor: tokens.bg,
                        border: `1px solid ${tokens.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" className="font-display" sx={{ fontWeight: 600, color: tokens.textPrimary }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.textSecondary, lineHeight: 1.6 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How it Works / Linear Pipeline */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography variant="h3" className="font-display" sx={{ fontWeight: 700, mb: 2 }}>
            The Vector Processing Pipeline
          </Typography>
          <Typography variant="body1" sx={{ color: tokens.textSecondary }}>
            See how raw text transitions to interactive clusters in four structured stages.
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ position: "relative" }}>
          {/* Step 1 */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "center", md: "flex-start" }, gap: 2 }}>
              <Typography variant="h2" className="font-display" sx={{ color: `${tokens.signal}30`, fontWeight: 800 }}>
                01
              </Typography>
              <Typography variant="subtitle1" className="font-display" sx={{ fontWeight: 600 }}>
                Data Ingestion
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.textSecondary, textAlign: { xs: "center", md: "left" } }}>
                Input plain documents, paste structured entries, or drop `.xlsx` and `.csv` files directly.
              </Typography>
            </Box>
          </Grid>

          {/* Step 2 */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "center", md: "flex-start" }, gap: 2 }}>
              <Typography variant="h2" className="font-display" sx={{ color: `${tokens.accent}30`, fontWeight: 800 }}>
                02
              </Typography>
              <Typography variant="subtitle1" className="font-display" sx={{ fontWeight: 600 }}>
                Vector Generation
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.textSecondary, textAlign: { xs: "center", md: "left" } }}>
                Generate vectors using cloud embeddings (Gemini/Hugging Face/OpenAI) or local CPU processing.
              </Typography>
            </Box>
          </Grid>

          {/* Step 3 */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "center", md: "flex-start" }, gap: 2 }}>
              <Typography variant="h2" className="font-display" sx={{ color: `${tokens.signal}30`, fontWeight: 800 }}>
                03
              </Typography>
              <Typography variant="subtitle1" className="font-display" sx={{ fontWeight: 600 }}>
                Clustering & Projection
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.textSecondary, textAlign: { xs: "center", md: "left" } }}>
                Apply PCA/t-SNE/UMAP to map vectors to 3D. Segment groups automatically with K-Means/DBSCAN.
              </Typography>
            </Box>
          </Grid>

          {/* Step 4 */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "center", md: "flex-start" }, gap: 2 }}>
              <Typography variant="h2" className="font-display" sx={{ color: `${tokens.accent}30`, fontWeight: 800 }}>
                04
              </Typography>
              <Typography variant="subtitle1" className="font-display" sx={{ fontWeight: 600 }}>
                Explore & Export
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.textSecondary, textAlign: { xs: "center", md: "left" } }}>
                Navigate nodes, find similar records using cosine similarity, and export the entire workspace as a CSV.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleLaunch}
            endIcon={<LaunchIcon />}
            sx={{ px: 6, py: 1.8, fontSize: "1rem", boxShadow: `0 8px 24px ${tokens.accent}40` }}
          >
            Launch Active Workspace
          </Button>
        </Box>
      </Container>

      {/* Footer */}
      <Divider sx={{ borderColor: tokens.border, mt: 4 }} />
      <Container maxWidth="lg" sx={{ pt: 4, display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Typography variant="caption" sx={{ color: tokens.textMuted }}>
          © {new Date().getFullYear()} AI Vector Space Visualization Platform. All rights reserved.
        </Typography>
        <Box sx={{ display: "flex", gap: 3 }}>
          <Typography variant="caption" sx={{ color: tokens.textMuted, cursor: "pointer", "&:hover": { color: tokens.textPrimary } }} onClick={handleLaunch}>
            Visualizer
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textMuted, cursor: "pointer", "&:hover": { color: tokens.textPrimary } }} href="#features">
            Features
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
