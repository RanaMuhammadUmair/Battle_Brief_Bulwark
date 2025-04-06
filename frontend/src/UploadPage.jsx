import React, { useState } from "react";
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
} from "@mui/material";

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [model, setModel] = useState("gpt4");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSummarize = async () => {
    if (!file) {
      alert("Please select a file!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);

    const response = await fetch("http://localhost:8000/summarize", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", color: "#1a237e" }}>
        Upload and Summarize
      </Typography>
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" component="label" sx={{ backgroundColor: "#1a237e" }}>
          Select File
          <input type="file" hidden onChange={handleFileChange} />
        </Button>
        <Typography variant="body1" sx={{ mt: 1, color: "#757575" }}>
          {file ? file.name : "No file selected"}
        </Typography>
      </Box>
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="model-select-label">Model</InputLabel>
        <Select
          labelId="model-select-label"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          sx={{ mt: 2 }} // Add spacing between the label and the dropdown
        >
          <MenuItem value="gpt4">GPT-4</MenuItem>
          <MenuItem value="bart">BART</MenuItem>
        </Select>
      </FormControl>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSummarize}
        disabled={loading}
        sx={{ backgroundColor: "#1a237e" }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : "Summarize"}
      </Button>
      {summary && (
        <Box sx={{ mt: 4, p: 2, backgroundColor: "#e8eaf6", borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Summary:
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
            {summary}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default UploadPage;
