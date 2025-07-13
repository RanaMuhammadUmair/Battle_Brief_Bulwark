/**
 * Material UI Theme Configuration
 * 
 * This file defines the application's custom theme using Material UI's theming system.
 * It establishes a military-inspired color palette that maintains consistent branding
 * across all UI components rendered through Material UI.
 */
import { createTheme } from "@mui/material";

/**
 * Military-Inspired Color Palette
 * 
 * A cohesive color scheme based on military aesthetics with olive green as the primary color.
 * This palette provides semantic color assignments for different UI elements and states:
 * - Primary: Olive drab tones for main actions and emphasis
 * - Secondary: Sage green for supporting elements
 * - Background: Clean white for readability and contrast
 * - Text: Dark slate gray for primary text, olive for secondary text
 * - Feedback: Success, warning and error states with appropriate colors
 */
const militaryPalette = {
  primary: {
    main:  "#556B2F", // Olive drab - primary brand color
    light: "#6B8E23", // Lighter olive for hover states
    dark:  "#3B5323", // Darker olive for active/pressed states
  },
  secondary: {
    main:  "#8F9779", // Sage green - complementary to primary
    light: "#A9B18F", // Lighter sage for hover states
    dark:  "#757F5E", // Darker sage for active/pressed states
  },
  background: {
    default: "#ffffff", // Clean white background for main content areas
    paper:   "#ffffff", // White background for card elements
  },
  text: {
    primary:   "#2F4F4F", // Dark slate gray for main text content
    secondary: "#556B2F", // Olive green for secondary text elements
  },
  success: { 
    main:  "#556B2F", // Using primary olive for success indications
    light: "#C5E1A5", // Light green for success backgrounds
  },
  warning: {
    main:  "#FFB74D", // Orange for warning states and notifications
  },
  error:   { main: "#8B0000" }, // Dark red for error states
  divider: "#ccc"               // Light gray for dividing elements
};

/**
 * Theme Export
 * 
 * Creates and exports a Material UI theme using our custom military palette.
 * This theme will be consumed by the ThemeProvider component to apply
 * consistent styling across all Material UI components in the application.
 */
export default createTheme({ palette: militaryPalette });