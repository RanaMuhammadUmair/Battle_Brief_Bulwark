/**
 * Application Entry Point
 * 
 * This file serves as the main entry point for the application.
 * It initializes React, applies theming, and renders the root component to the DOM.
 */

// Core React dependencies
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

// Material-UI theming
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";

// Global styles
import "./index.css";

/**
 * Application Rendering
 * 
 * Renders the application with the following structure:
 * 1. ThemeProvider - Applies consistent Material-UI theming across components
 * 2. App - The root component that manages routing and application state
 * 
 * The application is mounted to the DOM element with id="root" defined in index.html
 */
ReactDOM.render(
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>,
  document.getElementById("root")
);
