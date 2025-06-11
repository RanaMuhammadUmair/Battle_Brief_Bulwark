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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  LinearProgress
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import HistoryIcon from '@mui/icons-material/History';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const supportedFileTypes = [".txt", ".pdf", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mb

const UploadPage = ({ user }) => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [manualText, setManualText] = useState("");
  const [model, setModel] = useState("Mistral small");
  const [summaries, setSummaries] = useState([]);
  const [storedSummaries, setStoredSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);

  const modelOptions = [
    { name: "GPT-4.1",    value: "GPT-4.1",    logo: "/logos/ChatGPT-Logo.gif" },
    { name: "BART",       value: "BART",       logo: "/logos/meta-logo.gif" },
    { name: "CLAUDE",     value: "CLAUDE",     logo: "/logos/anthropic-logo.gif" },
    { name: "Mistral small",         value: "Mistral small",         logo: "/logos/mistral-logo.gif" },
    { name: "Gemini 2.5 Pro", value: "Gemini 2.5 Pro", logo: "/logos/Cgemini-logo.gif" },
    { name: "DeepSeek-R1", value: "DeepSeek-R1", logo: "/logos/deepseek-logo.gif" },
    { name: "Llama 3.1",  value: "Llama 3.1",  logo: "/logos/meta-logo2.gif" },
    { name: "Grok 3",        value: "Grok 3",        logo: "/logos/xAi-logo.gif" },
  ];

  // File change
  const handleFileChange = (e) => {
    const valid = Array.from(e.target.files).filter((f) => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();

      if (!supportedFileTypes.includes(ext)) {
        alert(`"${f.name}" not supported.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        alert("Maximum allowed file size is 10 Mb. Please select a smaller file or contact support to increase the limit.");
        return false;
      }
      return true;
    });

    setFiles(valid);
    setSelectedSummary(null);
  };

  const handleRemoveFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Fetch stored summaries
  async function fetchStoredSummaries() {
    try {
      const token = localStorage.getItem("token");
      const username = localStorage.getItem("username");
      const res = await fetch(`http://localhost:8000/summaries?user=${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // normalize metadata to an object
      const parsed = (data.summaries || []).map(item => ({
        ...item,
        metadata: typeof item.metadata === "string"
          ? JSON.parse(item.metadata)
          : item.metadata
      }));
      setStoredSummaries(parsed);
    } catch (e) {
      console.error("fetchStoredSummaries:", e);
    }
  }

  useEffect(() => {
    fetchStoredSummaries();
  }, []);

  const handleSummarize = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSelectedSummary(null); // Reset previous summary
    if (!files.length && !manualText.trim()) {
        alert("Select file or enter text!");
        return;
    }
    const username = localStorage.getItem("username");
    if (!username) return navigate("/login");

    setLoading(true);
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    if (manualText.trim()) {
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        form.append("files", new File([manualText], `clipboard-${ts}.txt`));
    }
    form.append("model", model);
    form.append("user_id", username);

    try {
        const res = await fetch("http://localhost:8000/summarize", {
            method: "POST",
            body: form,
        });
        const result = await res.json();
        const liveSummary = Object.entries(result).find(([_, value]) => typeof value !== "string");
        if (liveSummary) {
            const [filename, value] = liveSummary;
            setSelectedSummary({
                filename,
                summary: value.summary,
                metadata: typeof value.metadata === "string" ? JSON.parse(value.metadata) : value.metadata,
            });
        }
        setSummaries(Object.entries(result).map(([filename, value]) => ({
            filename,
            summary: typeof value === "string" ? null : value.summary,
            metadata: typeof value === "string" ? null : value.metadata,
            error: typeof value === "string" ? value : null,
        })));
    } catch (e) {
        console.error(e);
        setErrorMsg("Summarization failed");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    await fetch(`http://localhost:8000/summaries/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchStoredSummaries();
  };

  const renderHistory = () => {
    const sorted = [...storedSummaries].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return (
      <Box sx={{ width: 300, p: 2 }}>
        <Typography variant="h6">Summary History</Typography>
        <Divider sx={{ mb: 2 }} />
        {sorted.length === 0 ? (
          <Typography>No summaries.</Typography>
        ) : (
          <List>
            {sorted.map((item) => (
              <ListItem
                key={item.id}
                button
                onClick={() => {
                  setSelectedSummary(item);
                  setDrawerOpen(false);
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={item.filename}
                  secondary={
                    <>
                      <span>{item.summary.slice(0, 20)}…</span>
                      <br />
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                      <br />
                      <span>{item.metadata.model}</span>
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 0,
            borderBottom: "1px solid #ccc",
            backgroundColor: "#f5f5f5"
          }}
        >
          
          <img
            src="/logos/header logo1920 x 400.gif"
            alt="Animated NATO logo with dynamic elements, representing intelligence summarization in a modern digital workspace. The environment is professional and welcoming. The text NATO Intelligence Summarizer is displayed."
            width={600}
            left={20}
          />

          {/* user info + logout */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="subtitle1" sx={{ mr: 2, color: theme => theme.palette.text.primary }}>
            {user.username} {user.fullName && `(${user.fullName})`}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: 315,
            p: 2,
            borderRight: "1px solid #ccc",
            backgroundColor: "#fafafa",
            display: "flex",            /* make sidebar a column flex */
            flexDirection: "column"
          }}
        >
          <Button
            startIcon={<HistoryIcon />}
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => setDrawerOpen(true)}
            sx={{ mb: 2 }}
          >
            Show History
          </Button>
          <Button
            startIcon={<UploadFileIcon />}
            fullWidth
            component="label"
            variant="contained"
            color="primary"
          >
            Select Files
            <input hidden multiple type="file" onChange={handleFileChange} />
          </Button>
          <Box sx={{ mt: 2 }}>
            {files.length ? (
              files.map((f, i) => (
                <Box
                  key={i}
                  sx={{ display: "flex", alignItems: "center", color: "#757575", mb: 0.5 }}
                >
                  <Typography sx={{ flexGrow: 1 }}>{f.name.slice(0, 22)}{f.name.length > 22 ? "…" : ""}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(i)}
                    aria-label="Remove file"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))
            ) : (
              <Typography
                sx={theme => ({ color: theme.palette.text.secondary })}
              >
                No files selected.
              </Typography>
            )}
          </Box>

          <Button
            startIcon={<SettingsIcon />}
            fullWidth
            variant="outlined"
            color="secondary"
            sx={{ mt: 'auto' }}     // you can leave this JS‐style comment here
            onClick={() => navigate("/settings")}
          >
            Settings
          </Button>
        </Box>

        {/* Main */}
        <Paper elevation={3} sx={{ flex: 1, p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Select Model</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {modelOptions.map(opt => (
              <Grid item xs={3} key={opt.value} sx={{ display: "flex" }} width={180} height={138}>
                <Box
                  onClick={() => setModel(opt.value)}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    p: 2,
                    border: 1,
                    borderColor: model === opt.value ? "primary.main" : "grey.300",
                    borderRadius: 1,
                    cursor: "pointer",
                    backgroundColor: model === opt.value ? "primary.light" : "background.paper",
                    // glow on selected
                    boxShadow: model === opt.value
                      ? "0 10px 20px rgba(196, 255, 3, 0.58)"
                      : "none",
                    transition: "box-shadow 0.2s ease"
                  }}
                >
                  <img src={opt.logo} alt={opt.name} width={160} height={160} />
                  <Typography sx={{ mt: 1 }}>{opt.name}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <TextField
            multiline
            rows={8}
            fullWidth
            placeholder="Enter text manually or paste content here..."
            label="Enter Plain Text"
            variant="outlined"
            sx={{ mb: 3 }}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
          />

          {/* Summarize Button */}
          <Button
            variant="contained"
            sx={theme => ({
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.common.white,
            })}
            disabled={loading}
            onClick={handleSummarize}
          >
            {loading ? (
                <CircularProgress size={24} sx={{ color: theme => theme.palette.common.white }} />
            ) : (
                "Summarize"
            )}
          </Button>

          {errorMsg && <Alert severity="error" sx={{ mt: 3 }}>{errorMsg}</Alert>}

          {/* Display live or selected summary */}
          <Box sx={{ mt: 4 }}>
            {selectedSummary ? (
                <Box sx={{ mb: 3 }}>
                    {/* Summary Details */}
                    <Chip
                        sx={theme => ({ mb: 1, backgroundColor: theme.palette.warning.main })}
                        label={`Summary of "${selectedSummary.filename}"`}
                    />
                    <Chip
                        sx={theme => ({ mb: 1, ml: 1, backgroundColor: theme.palette.success.light })}
                        label={`Model: ${selectedSummary.metadata.model}`}
                    />
                    <Chip label={new Date(selectedSummary.created_at).toLocaleString()} sx={{ mb: 1, ml: 1, backgroundColor: "#ffb74d" }} />
                    <Card variant="outlined">
                        <CardContent>
                            <Typography sx={{ whiteSpace: "pre-wrap" }}>{selectedSummary.summary}</Typography>
                        </CardContent>
                    </Card>
                    <Button
                        variant="contained"
                        sx={theme => ({
                            mt: 1,
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.common.white,
                        })}
                        onClick={() => navigator.clipboard.writeText(selectedSummary.summary)}
                    >
                        Copy
                    </Button>
                    <Button
                        variant="outlined"
                        sx={theme => ({
                            mt: 1,
                            ml: 1,
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                        })}
                        onClick={() => {
                            const doc = new jsPDF();
                            doc.text(selectedSummary.summary, 10, 10, { maxWidth: 190 });
                            doc.save(`${selectedSummary.filename}.pdf`);
                        }}
                    >
                        Download PDF
                    </Button>

                    {/* Quality Score Table */}
                    <Typography variant="h6" sx={{ mt: 4 }}>Quality Scores</Typography>
                    <Box sx={{ display: "flex", alignItems: "flex-start", mt: 2 }}>
                        {/* Quality Scores Table */}
                        <TableContainer component={Paper} sx={{ flex: 2, maxWidth: "70%", mr: 2 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Criteria</TableCell>
                                        <TableCell align="right">Score</TableCell>
                                        <TableCell>Justification</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Object.entries(selectedSummary.metadata.quality_scores || {}).map(([criteria, details]) => (
                                        <TableRow key={criteria}>
                                            <TableCell>{criteria}</TableCell>
                                            <TableCell align="right">{details.score}</TableCell>
                                            <TableCell>{details.justification}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Infographic Section */}
                        <Box sx={{ flex: 1, maxWidth: "30%" }}>
                          <Typography variant="subtitle1" sx={{ mb: 2 }}>Quality Scores Breakdown</Typography>
                          <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                  <Pie
                                      data={Object.entries(selectedSummary.metadata.quality_scores || {}).map(([criteria, details]) => ({
                                          name: criteria,
                                          value: details.score,
                                      }))}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={120}
                                      fill="#8884d8"
                                      label
                                  >
                                      {Object.entries(selectedSummary.metadata.quality_scores || {}).map(([criteria], index) => (
                                          <Cell
                                              key={`cell-${index}`}
                                              fill={
                                                  index === 0
                                                      ? "#ffb74d" // Orange (used in chips)
                                                      : index === 1
                                                      ? "#82ca9d" // Green (used in success chips)
                                                      : index === 2
                                                      ? "#8884d8" // Purple (used in buttons)
                                                      : index === 3
                                                      ? "#ffc658" // Yellow (used in warnings)
                                                      : "#d0ed57" // Light green (fallback)
                                              }
                                          />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                              </PieChart>
                          </ResponsiveContainer>
                        </Box>
                    </Box>

  
                    {/* Ethical Considerations Table */}
                    <Typography variant="h6" sx={{ mt: 4 }}>Ethical Considerations</Typography>
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Report Text (%)</TableCell>
                                    <TableCell>Summary (%)</TableCell>
                                    <TableCell>Difference (%)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(selectedSummary.metadata.detox_report || {}).map((category) => {
                                    const formattedCategory = category
                                        .replace(/_/g, " ") // Replace underscores with spaces
                                        .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
                                    const reportScore = (selectedSummary.metadata.detox_report[category] || 0) * 100;
                                    const summaryScore = (selectedSummary.metadata.detox_summary[category] || 0) * 100;
                                    const difference = (summaryScore - reportScore).toFixed(2);
                                    return (
                                        <TableRow key={category}>
                                            <TableCell>{formattedCategory}</TableCell>
                                            <TableCell>{reportScore.toFixed(2)}</TableCell>
                                            <TableCell>{summaryScore.toFixed(2)}</TableCell>
                                            <TableCell sx={{ color: difference <= 0 ? "green" : "red" }}>
                                                {difference}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {/* Overall Row */}
                                <TableRow>
                                    <TableCell><strong>Overall</strong></TableCell>
                                    <TableCell>
                                        {(
                                            Object.values(selectedSummary.metadata.detox_report || {}).reduce((acc, val) => acc + val, 0) /
                                            Object.keys(selectedSummary.metadata.detox_report || {}).length * 100
                                        ).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        {(
                                            Object.values(selectedSummary.metadata.detox_summary || {}).reduce((acc, val) => acc + val, 0) /
                                            Object.keys(selectedSummary.metadata.detox_summary || {}).length * 100
                                        ).toFixed(2)}
                                    </TableCell>
                                    <TableCell sx={{
                                        color: (
                                            Object.keys(selectedSummary.metadata.detox_report || {}).reduce((acc, category) => {
                                                const reportScore = selectedSummary.metadata.detox_report[category] || 0;
                                                const summaryScore = selectedSummary.metadata.detox_summary[category] || 0;
                                                return acc + (summaryScore - reportScore);
                                            }, 0) /
                                            Object.keys(selectedSummary.metadata.detox_report || {}).length * 100
                                        ) <= 0 ? "green" : "red"
                                    }}>
                                        {(
                                            Object.keys(selectedSummary.metadata.detox_report || {}).reduce((acc, category) => {
                                                const reportScore = selectedSummary.metadata.detox_report[category] || 0;
                                                const summaryScore = selectedSummary.metadata.detox_summary[category] || 0;
                                                return acc + (summaryScore - reportScore);
                                            }, 0) /
                                            Object.keys(selectedSummary.metadata.detox_report || {}).length * 100
                                        ).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Explanation */}
                    <Box sx={{ mt: 2 }}>
                        {(() => {
                            const overallDifference = (
                                Object.keys(selectedSummary.metadata.detox_report || {}).reduce((acc, category) => {
                                    const reportScore = selectedSummary.metadata.detox_report[category] || 0;
                                    const summaryScore = selectedSummary.metadata.detox_summary[category] || 0;
                                    return acc + (summaryScore - reportScore);
                                }, 0) /
                                Object.keys(selectedSummary.metadata.detox_report || {}).length * 100
                            ).toFixed(2);

                            if (overallDifference <= 0) {
                                return (
                                    <Typography sx={{ color: "green" }}>
                                        Generated summary has {Math.abs(overallDifference)}% less toxic content compared to the original provided report.
                                    </Typography>
                                );
                            } else {
                                return (
                                    <Typography sx={{ color: "red" }}>
                                        Generated summary contains more toxic content than the original text. Summary needs human review.
                                    </Typography>
                                );
                            }
                        })()}
                    </Box>

                    {/* Toxicity Comparison Chart */}
                    <Typography variant="h6" sx={{ mt: 4 }}>Toxicity Comparison</Typography>
                    <ResponsiveContainer width="100%" height={300} sx={{ mt: 2 }}>
                        <BarChart
                            data={Object.keys(selectedSummary.metadata.detox_report || {}).map((category) => ({
                                aspect: category
                                    .replace(/_/g, " ") // Replace underscores with spaces
                                    .replace(/\b\w/g, (char) => char.toUpperCase()), // Capitalize first letter of each word
                                report: (selectedSummary.metadata.detox_report[category] * 100).toFixed(2), // Convert to percentage
                                summary: (selectedSummary.metadata.detox_summary[category] * 100).toFixed(2), // Convert to percentage
                            }))}
                        >
                            <XAxis dataKey="aspect" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="report" fill="#8884d8" name="Report Text" />
                            <Bar dataKey="summary" fill="#82ca9d" name="Summary Text" />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            ) : (
                <Typography>No live summary available.</Typography>
            )}
          </Box>
        </Paper>
      </Box>

      {/* History Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box
          sx={{ width: 295 }}
          role="presentation"
          onClick={() => setDrawerOpen(false)}
          onKeyDown={() => setDrawerOpen(false)}
        >
          {renderHistory()}
        </Box>
      </Drawer>
    </Box>
  );
};

export default UploadPage;
