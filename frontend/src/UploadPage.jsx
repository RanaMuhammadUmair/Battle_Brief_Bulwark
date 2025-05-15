import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Paper,
  Chip,
  Card,
  CardContent,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { keyframes } from "@emotion/react";

const supportedFileTypes = [".txt", ".pdf", ".docx"];

const UploadPage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [manualText, setManualText] = useState("");
  const [model, setModel] = useState("t5");
  const [summaries, setSummaries] = useState({});
  const [storedSummaries, setStoredSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);

  // File selection handler with file type validation
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter((file) => {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (supportedFileTypes.includes(extension)) {
        return true;
      } else {
        alert(
          `File "${file.name}" is not supported. Allowed types: ${supportedFileTypes.join(", ")}`
        );
        return false;
      }
    });
    setFiles(validFiles);
    // Clear the selected summary when selecting new files
    setSelectedSummary(null);
  };

  // Summarize handler with manual text input support
  const handleSummarize = async () => {
    // If no file is selected and no manual text is provided, alert the user.
    if (files.length === 0 && manualText.trim() === "") {
      alert("Please select at least one file or enter text manually!");
      return;
    }
    // Retrieve username from localStorage
    const username = localStorage.getItem("username");
    if (!username) {
      alert("User information is missing. Please log in again.");
      navigate("/login");
      return;
    }
    // Clear any selected summary so the live view updates with new results.
    setSelectedSummary(null);
    setLoading(true);
    const formData = new FormData();

    // Append selected files
    files.forEach((file) => {
      formData.append("files", file);
    });

    // If manual text is provided, create a file from it.
    if (manualText.trim() !== "") {
      const date = new Date();
      // Replace colon and dot for safe file naming
      const timestamp = date
        .toISOString()
        .replace(/[:.]/g, "-");
      const fileName = `clipboardtext-${timestamp}.txt`;
      const textFile = new File([manualText], fileName, { type: "text/plain" });
      formData.append("files", textFile);
    }

    formData.append("model", model);
    // Send the username as user_id so backend can store the summary
    formData.append("user_id", username);

    try {
      const response = await fetch("http://localhost:8000/summarize", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setSummaries(data);
      // Refresh stored summaries after generating a new summary
      fetchStoredSummaries();
    } catch (error) {
      console.error(error);
      setErrorMsg("Summarization failed");
    } finally {
      setLoading(false);
    }
  };

  // Toggle drawer (history) open/close
  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  // Fetch stored summaries from backend for the logged-in user
  const fetchStoredSummaries = async () => {
    try {
      const token = localStorage.getItem("token");
      const username = localStorage.getItem("username");
      const response = await fetch(`http://localhost:8000/summaries?user=${username}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      // Expecting an array of summaries with filename and summary fields.
      setStoredSummaries(data.summaries || []);
    } catch (error) {
      console.error("Failed fetching stored summaries", error);
    }
  };

  // Logout handler: remove token and navigate to login
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  // Load stored summaries when component mounts
  useEffect(() => {
    fetchStoredSummaries();
  }, []);

  // Render history drawer: only the list is shown
  const renderHistory = () => {
    // Sort the stored summaries in descending order (most recent first)
    const sortedSummaries = [...storedSummaries].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return (
      <Box sx={{ width: 300, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Summary History
        </Typography>
        <Divider />
        {sortedSummaries.length === 0 ? (
          <Typography variant="body2" sx={{ mt: 2 }}>
            No summaries available.
          </Typography>
        ) : (
          <List>
            {sortedSummaries.map((item, index) => (
              <ListItem
                key={index}
                button
                onClick={() => {
                  setSelectedSummary(item);
                  setDrawerOpen(false);
                }}
              >
                <ListItemText
                  primary={item.filename}
                  secondary={
                    <>
                      <span>{item.summary.slice(0, 50)}...</span>
                      <br />
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Header with Title and Logout */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: "1px solid #ccc",
          backgroundColor: "#f5f5f5",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
          Nato Intelligence Reports Summarizer
        </Typography>
        <Button variant="contained" onClick={handleLogout} sx={{ backgroundColor: "#1a237e" }}>
          Logout
        </Button>
      </Box>

      <Box sx={{ display: "flex", flex: 1 }}>
        {/* Left Sidebar with "Show History" and "Select Files" */}
        <Box sx={{ width: 250, p: 2, borderRight: "1px solid #ccc", backgroundColor: "#fafafa" }}>
          <Button
            variant="contained"
            fullWidth
            onClick={toggleDrawer(true)}
            sx={{ backgroundColor: "#1a237e", mb: 2 }}
          >
            Show History
          </Button>
          <Button variant="contained" component="label" fullWidth sx={{ backgroundColor: "#1a237e" }}>
            Select Files
            <input type="file" hidden multiple onChange={handleFileChange} />
          </Button>
          <Box sx={{ mt: 1 }}>
            {files.length > 0 ? (
              files.map((file, index) => (
                <Typography key={index} variant="body1" sx={{ color: "#757575" }}>
                  {file.name}
                </Typography>
              ))
            ) : (
              <Typography variant="body1" sx={{ color: "#757575" }}>
                No files selected
              </Typography>
            )}
          </Box>
        </Box>

        {/* Main Content Area for uploading and live summaries */}
        <Paper elevation={3} sx={{ p: 4, flex: 1 }}>
          {/* Model Selection */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="model-select-label">Model</InputLabel>
            <Select
              labelId="model-select-label"
              value={model}
              label="Model"
              onChange={(e) => setModel(e.target.value)}
              sx={{ mt: 2 }}
            >
              <MenuItem value="gpt4.1">GPT-4.1 by OpenAi</MenuItem>
              <MenuItem value="bart">BART</MenuItem>
              <MenuItem value="claude">CLAUDE</MenuItem>
              <MenuItem value="t5">T5</MenuItem>
              <MenuItem value="gemini2point5_pro">Gemini 2.5 Pro</MenuItem>
              <MenuItem value="deepseek-r1">DeepSeek-R1-runpod</MenuItem>
            </Select>
          </FormControl>

          {/* Manual Text Input Box placed below the model selection and taking full width */}
          <TextField
            label="Enter text manually for summarizing"
            multiline
            rows={4}
            fullWidth
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            variant="outlined"
            sx={{ mb: 3 }}
          />

          {/* Summarize Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleSummarize}
            disabled={loading}
            sx={{ backgroundColor: "#1a237e" }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Summarize"}
          </Button>
          
          {errorMsg && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {errorMsg}
            </Alert>
          )}
          
          {/* Live Generated Summaries Area */}
          <Box
            sx={{
              mt: 4,
              borderRadius: 1,
              p: 0,
            }}
          >
            {selectedSummary ? (
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={`Summary of "${selectedSummary.filename}"`}
                  sx={{
                    backgroundColor: "#ffb74d",
                    color: "#1a237e",
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    px: 1.5,
                    py: 0.5,
                    mb: 1,
                  }}
                />
                {selectedSummary.metadata &&
                  (() => {
                    let modelUsed = "";
                    try {
                      modelUsed = JSON.parse(selectedSummary.metadata).model;
                    } catch (e) {
                      console.error("Error parsing metadata for model", e);
                    }
                    return (
                      <Chip
                        label={`Model: ${modelUsed}`}
                        sx={{
                          backgroundColor: "#c5e1a5",
                          color: "#1a237e",
                          fontSize: "1.1rem",
                          fontWeight: "bold",
                          px: 1.5,
                          py: 0.5,
                          ml: 1,
                          mb: 1,
                        }}
                      />
                    );
                  })()}
                {selectedSummary.created_at && (
                  <Chip
                    label={`Time: ${new Date(selectedSummary.created_at).toLocaleString()}`}
                    sx={{
                      backgroundColor: "#ffb74d",
                      color: "#1a237e",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      px: 1.5,
                      py: 0.5,
                      ml: 1,
                      mb: 1,
                    }}
                  />
                )}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                      {selectedSummary.summary}
                    </Typography>
                  </CardContent>
                </Card>
                <Button
                  variant="contained"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedSummary.summary);
                    alert("Summary copied to clipboard");
                  }}
                  sx={{ backgroundColor: "#1a237e", mt: 1 }}
                >
                  Copy to Clipboard
                </Button>
              </Box>
            ) : (
              Object.keys(summaries).length > 0 &&
              Object.entries(summaries).map(([filename, summary]) => (
                <Box key={filename} sx={{ mb: 3 }}>
                  <Chip
                    label={`Summary of "${filename}"`}
                    sx={{
                      backgroundColor: "#ffb74d",
                      color: "#1a237e",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      px: 1.5,
                      py: 0.5,
                      mb: 1,
                    }}
                  />
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                        {summary}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Button
                    variant="contained"
                    onClick={() => {
                      navigator.clipboard.writeText(summary);
                      alert("Summary copied to clipboard");
                    }}
                    sx={{ backgroundColor: "#1a237e", mt: 1 }}
                  >
                    Copy to Clipboard
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </Paper>
      </Box>

      {/* Drawer for Summary History */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        {renderHistory()}
      </Drawer>

      {/* Footer Disclaimer */}
      <Box
        component="footer"
        sx={{
          mt: "auto",
          p: 2,
          backgroundColor: "#f5f5f5",
          borderTop: "1px solid #ccc",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "#757575"
        }}
      >
        <Typography variant="body2">
          <strong>Disclaimer: </strong>
          This website is a Master’s thesis project of UIS student. Please do not upload or include any confidential or current intelligence reports. For testing purposes, only use historical documents that no longer carry real‐world value or anonymized/dummy data.
          The author assumes no responsibility for any misuse of sensitive information.
        </Typography>
      </Box>
    </Box>
  );
};

export default UploadPage;
