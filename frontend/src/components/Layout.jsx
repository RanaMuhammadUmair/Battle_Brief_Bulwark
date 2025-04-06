import React from "react";
import { AppBar, Toolbar, Typography, Button, Container, Box } from "@mui/material";
import { Link } from "react-router-dom";

const Layout = ({ children }) => {
  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "#1a237e" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            NATO Intelligence Summarizer
          </Typography>
          <Button color="inherit" component={Link} to="/" sx={{ fontWeight: "bold" }}>
            Upload
          </Button>
          <Button color="inherit" component={Link} to="/summaries" sx={{ fontWeight: "bold" }}>
            Summaries
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Box sx={{ backgroundColor: "#f5f5f5", p: 3, borderRadius: 2, boxShadow: 1 }}>
          {children}
        </Box>
      </Container>
    </>
  );
};

export default Layout;
