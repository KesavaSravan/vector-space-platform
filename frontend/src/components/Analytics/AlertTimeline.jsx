import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { Timeline as TimelineIcon } from "@mui/icons-material";
import { useAppState, useAppActions } from "../../context/AppContext";
import { SEVERITY_COLORS, tokens } from "../../theme";

export default function AlertTimeline() {
  const state = useAppState();
  const { selectVector } = useAppActions();

  const { points, selectedId } = state;

  // Extract and sort timeline points
  const timelineData = React.useMemo(() => {
    return points
      .filter((p) => p.metadata && p.metadata.timestamp)
      .map((p) => {
        let dateObj;
        try {
          dateObj = new Date(p.metadata.timestamp);
        } catch (e) {
          dateObj = new Date();
        }
        return {
          id: p.id,
          label: p.label,
          severity: p.metadata.severity || "Low",
          timestamp: dateObj,
          rawTimestamp: p.metadata.timestamp
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [points]);

  if (timelineData.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "80%",
          gap: 2,
          p: 2,
          textAlign: "center"
        }}
      >
        <TimelineIcon sx={{ fontSize: 48, color: tokens.textMuted }} />
        <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
          No timestamps found. Please ensure uploaded vectors contain a "timestamp" field in their metadata (ISO 8601 format, e.g. "2026-06-20T10:00:00Z").
        </Typography>
      </Box>
    );
  }

  const rowHeight = 40;
  const svgWidth = 320;
  const svgHeight = timelineData.length * rowHeight + 20;

  // Helper to format date simply: "Jun 20, 10:00"
  const formatDate = (date) => {
    if (isNaN(date.getTime())) return "Invalid Date";
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${month} ${day} ${hours}:${minutes}`;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ borderBottom: `1px solid ${tokens.border}`, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: tokens.textPrimary, fontWeight: 700 }}>
          Chronological Event Timeline
        </Typography>
        <Typography variant="caption" sx={{ color: tokens.textMuted }}>
          Click an event dot to select and locate the node in 3D space.
        </Typography>
      </Box>

      {/* Timeline Scroll Box */}
      <Paper
        sx={{
          p: 1,
          maxHeight: "70vh",
          overflowY: "auto",
          backgroundColor: tokens.surface2
        }}
      >
        <svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: "block" }}
        >
          {/* Vertical axis line */}
          <line
            x1="85"
            y1="10"
            x2="85"
            y2={svgHeight - 10}
            stroke={tokens.border}
            strokeWidth="2"
          />

          {timelineData.map((item, idx) => {
            const y = idx * rowHeight + 20;
            const severityColor = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.Low;
            const isSelected = item.id === selectedId;

            return (
              <g
                key={item.id}
                onClick={() => selectVector(item.id)}
                style={{ cursor: "pointer" }}
              >
                {/* Time Label (Left of line) */}
                <text
                  x="75"
                  y={y}
                  fill={isSelected ? tokens.signal : tokens.textSecondary}
                  fontSize="9px"
                  fontFamily="JetBrains Mono"
                  textAnchor="end"
                  alignmentBaseline="middle"
                >
                  {formatDate(item.timestamp)}
                </text>

                {/* Selected Outer Ring */}
                {isSelected && (
                  <circle
                    cx="85"
                    cy={y}
                    r="9"
                    fill="none"
                    stroke={tokens.signal}
                    strokeWidth="2"
                    opacity="0.8"
                  />
                )}

                {/* Event Dot (On line) */}
                <circle
                  cx="85"
                  cy={y}
                  r={isSelected ? "5" : "4"}
                  fill={severityColor}
                  stroke={isSelected ? tokens.bg : "none"}
                  strokeWidth="1.5"
                  className="timeline-dot"
                  style={{
                    transition: "r 0.2s"
                  }}
                />

                {/* Event Label (Right of line) */}
                <text
                  x="98"
                  y={y}
                  fill={isSelected ? tokens.signal : tokens.textPrimary}
                  fontSize="10px"
                  fontFamily={tokens.fontDisplay}
                  fontWeight={isSelected ? "bold" : "normal"}
                  alignmentBaseline="middle"
                  textAnchor="start"
                >
                  {/* Truncate label if it exceeds length */}
                  {item.label.length > 25 ? item.label.substring(0, 22) + "..." : item.label}
                </text>

                {/* Mini ID subtitle under name */}
                <text
                  x="98"
                  y={y + 11}
                  fill={tokens.textMuted}
                  fontSize="8px"
                  fontFamily="JetBrains Mono"
                  alignmentBaseline="middle"
                  textAnchor="start"
                >
                  {item.id}
                </text>
              </g>
            );
          })}
        </svg>
      </Paper>
    </Box>
  );
}
