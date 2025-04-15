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
  Chip,
} from "@mui/material";

// List of supported file types (match backend settings)
const supportedFileTypes = [".txt", ".pdf", ".docx"];

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const [model, setModel] = useState("gpt4");
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter((file) => {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (supportedFileTypes.includes(extension)) {
        return true;
      } else {
        alert(`File "${file.name}" is not supported. Allowed types: ${supportedFileTypes.join(", ")}`);
        return false;
      }
    });
    setFiles(validFiles);
  };

  const handleSummarize = async () => {
    if (files.length === 0) {
      alert("Please select at least one file!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("model", model);

    const response = await fetch("http://localhost:8000/summarize", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.summaries) {
      setSummaries(data.summaries);
    } else if (data.summary) {
      setSummaries({ "Report": data.summary });
    }
    setLoading(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", color: "#1a237e" }}
      >
        Upload and Summarize
      </Typography>
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          component="label"
          sx={{ backgroundColor: "#1a237e" }}
        >
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
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="model-select-label">Model</InputLabel>
        <Select
          labelId="model-select-label"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          sx={{ mt: 2 }}
        >
          <MenuItem value="gpt4">GPT-4</MenuItem>
          <MenuItem value="bart">BART</MenuItem>
          <MenuItem value="claude">CLAUDE</MenuItem>
          <MenuItem value="t5">T5</MenuItem>
          <MenuItem value="google-pegasus">Google Pegasus</MenuItem>
          <MenuItem value="deepseek-r1">DeepSeek-R1-runpod</MenuItem>
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
      {Object.keys(summaries).length > 0 && (
        <Box sx={{ mt: 2 }}>
          {Object.entries(summaries).map(([filename, summary]) => (
            <Box key={filename} sx={{ mb: 2 }}>
              <Chip
                label={`Summary of "${filename}"`}
                sx={{
                  backgroundColor: "#ffb74d",
                  color: "#1a237e",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  padding: "20px",
                  mb: 2,
                }}
              />
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "#e8eaf6",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                  {summary}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default UploadPage;
