import { createTheme } from "@mui/material/styles";

// Custom Design Tokens
export const tokens = {
  bg: "#0A0C12",
  surface: "#11141C",
  surface2: "#161A24",
  surface3: "#1C2230",
  border: "#232838",
  accent: "#7C5CFF",       // indigo — clusters / structure
  signal: "#00E5C7",       // cyan — selection / active
  textPrimary: "#E7E9F0",
  textSecondary: "#8C93A8",
  textMuted: "#5A6178",
  fontDisplay: "Space Grotesk",
  fontMono: "JetBrains Mono"
};

// 15 Distinct Colors for Cluster Coloring
export const CLUSTER_COLORS = [
  "#7C5CFF", // Indigo Accent
  "#00E5C7", // Cyan Signal
  "#FF2D55", // Bright Pink
  "#FF9500", // Soft Orange
  "#AF52DE", // Deep Purple
  "#34C759", // Emerald Green
  "#5AC8FA", // Sky Blue
  "#FFCC00", // Yellow Gold
  "#FF3B30", // Bright Red
  "#E5C700", // Mustard
  "#007AFF", // Navy Blue
  "#4CD964", // Lime Green
  "#FF4F00", // Safety Orange
  "#D0021B", // Dark Crimson
  "#8E8E93"  // Slate Grey
];

// Severity Colors
export const SEVERITY_COLORS = {
  Critical: "#FF3B30", // Red
  High: "#FF9500",     // Orange
  Medium: "#FFCC00",   // Yellow
  Low: "#34C759"       // Green
};

// MUI theme definition
const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: tokens.bg,
      paper: tokens.surface,
    },
    primary: {
      main: tokens.accent,
    },
    secondary: {
      main: tokens.signal,
    },
    divider: tokens.border,
    text: {
      primary: tokens.textPrimary,
      secondary: tokens.textSecondary,
      disabled: tokens.textMuted,
    },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    h4: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500 },
    h6: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500 },
    subtitle1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500 },
    subtitle2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500 },
    body1: { fontFamily: '"Inter", sans-serif' },
    body2: { fontFamily: '"Inter", sans-serif' },
    button: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, textTransform: "none" },
    caption: { fontFamily: '"Inter", sans-serif' },
    overline: { fontFamily: '"Inter", sans-serif' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none"
          }
        },
        containedPrimary: {
          backgroundColor: tokens.accent,
          color: tokens.textPrimary,
          "&:hover": {
            backgroundColor: "#6747E6"
          }
        },
        containedSecondary: {
          backgroundColor: tokens.signal,
          color: tokens.bg,
          "&:hover": {
            backgroundColor: "#00C7AD"
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderStyle: "solid",
          borderWidth: 1,
          borderRadius: 12,
          backgroundImage: "none"
        }
      }
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface2,
          borderRadius: "8px !important",
          margin: "8px 0 !important",
          border: `1px solid ${tokens.border}`,
          "&:before": {
            display: "none"
          }
        }
      }
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding: "0 16px"
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            backgroundColor: tokens.bg,
            "& fieldset": {
              borderColor: tokens.border
            },
            "&:hover fieldset": {
              borderColor: tokens.accent
            },
            "&.Mui-focused fieldset": {
              borderColor: tokens.signal
            }
          }
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${tokens.border}`,
          minHeight: 44
        },
        indicator: {
          backgroundColor: tokens.signal
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          fontSize: "0.85rem",
          minHeight: 44,
          textTransform: "none",
          color: tokens.textSecondary,
          "&.Mui-selected": {
            color: tokens.signal
          }
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: tokens.border
        }
      }
    }
  }
});

export default theme;
