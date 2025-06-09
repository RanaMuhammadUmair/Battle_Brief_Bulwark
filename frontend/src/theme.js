import { createTheme } from "@mui/material";

const militaryPalette = {
  primary: {
    main:  "#556B2F",
    light: "#6B8E23",
    dark:  "#3B5323",
  },
  secondary: {
    main:  "#8F9779",
    light: "#A9B18F",
    dark:  "#757F5E",
  },
  background: {
    default: "#ffffff",
    paper:   "#ffffff",
  },
  text: {
    primary:   "#2F4F4F",
    secondary: "#556B2F",
  },
  success: { 
    main:  "#556B2F",
    light: "#C5E1A5",    // was #c5e1a5
  },
  warning: {
    main:  "#FFB74D",    // was #ffb74d
  },
  error:   { main: "#8B0000" },
  divider: "#ccc"
};

export default createTheme({ palette: militaryPalette });