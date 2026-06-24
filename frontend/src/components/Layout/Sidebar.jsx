import React, { useState } from "react";
import { Box, Accordion, AccordionSummary, AccordionDetails, Typography } from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  CloudUpload as UploadIcon,
  FilterList as FilterIcon,
  SettingsInputComponent as AlgoIcon
} from "@mui/icons-material";
import UploadPanel from "../Upload/UploadPanel";
import SearchFilterPanel from "../Search/SearchFilterPanel";
import AlgorithmPanel from "../Algorithms/AlgorithmPanel";
import { tokens } from "../../theme";

export default function Sidebar() {
  const [expanded, setExpanded] = useState({
    upload: true,
    filters: true,
    algorithms: false
  });

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded((prev) => ({ ...prev, [panel]: isExpanded }));
  };

  return (
    <Box
      sx={{
        width: 320,
        height: "100%",
        borderRight: `1px solid ${tokens.border}`,
        backgroundColor: tokens.surface,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      <Box className="scrollable-panel" sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        
        {/* Section 1: Upload & Input */}
        <Accordion expanded={expanded.upload} onChange={handleChange("upload")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <UploadIcon sx={{ fontSize: 18, color: tokens.accent }} />
              <Typography variant="subtitle2" className="font-display">
                Data Ingestion
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, pt: 0 }}>
            <UploadPanel />
          </AccordionDetails>
        </Accordion>

        {/* Section 2: Search & Filters */}
        <Accordion expanded={expanded.filters} onChange={handleChange("filters")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FilterIcon sx={{ fontSize: 18, color: tokens.signal }} />
              <Typography variant="subtitle2" className="font-display">
                Filters & Search
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, pt: 0 }}>
            <SearchFilterPanel />
          </AccordionDetails>
        </Accordion>

        {/* Section 3: Algorithms */}
        <Accordion expanded={expanded.algorithms} onChange={handleChange("algorithms")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AlgoIcon sx={{ fontSize: 18, color: tokens.signal }} />
              <Typography variant="subtitle2" className="font-display">
                Clustering & Projection
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, pt: 0 }}>
            <AlgorithmPanel />
          </AccordionDetails>
        </Accordion>

      </Box>
    </Box>
  );
}
