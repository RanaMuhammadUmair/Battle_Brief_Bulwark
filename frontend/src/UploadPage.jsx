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
  Grid
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import HistoryIcon from '@mui/icons-material/History';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
  Legend
} from 'recharts';

const supportedFileTypes = [".txt", ".pdf", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mb

const UploadPage = ({ user }) => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [manualText, setManualText] = useState("");
  const [model, setModel] = useState("Detoxify");
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
    { name: "Detoxify",         value: "Detoxify",         logo: "/logos/mistral-logo.gif" },
    { name: "Gemini 2.5 Pro", value: "Gemini 2.5 Pro", logo: "/logos/Cgemini-logo.gif" },
    { name: "DeepSeek-R1", value: "DeepSeek-R1", logo: "/logos/deepseek-logo.gif" },
    { name: "Llama 3.1",  value: "Llama 3.1",  logo: "/logos/meta-logo2.gif" },
    { name: "xAI",        value: "xAI",        logo: "/logos/xAi-logo.gif" },
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
  const fetchStoredSummaries = async () => {
    try {
      const token = localStorage.getItem("token");
      const username = localStorage.getItem("username");
      const res = await fetch(`http://localhost:8000/summaries?user=${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStoredSummaries(data.summaries || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStoredSummaries();
  }, []);

  const handleSummarize = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSelectedSummary(null);
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
        body: form
      });
      const result = await res.json();
      // result is { filename1: { summary,… }, filename2: "Error processing file: …", … }
      const live = Object.entries(result).map(([filename, value]) => {
        if (typeof value === "string") {
          return { filename, error: value };
        }
        return {
          filename,
          summary: value.summary,
          metadata: value.metadata
        };
      });
      setSummaries(live);
      fetchStoredSummaries();
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
                      <span>{JSON.parse(item.metadata).model}</span>
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
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: "1px solid #ccc",
          backgroundColor: "#f5f5f5"
        }}
      >
        <Typography variant="h4" sx={{ color: "#1a237e" }}>
          Nato Intelligence Summarizer
        </Typography>

        {/* user info + logout */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="subtitle1" sx={{ mr: 2, color: "#333" }}>
            {user.username} {user.fullName && `(${user.fullName})`}
          </Typography>
          <Button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            sx={{ backgroundColor: "#1a237e" }}
            variant="contained"
          >
            Logout
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <Box sx={{ width: 290, p: 2, borderRight: "1px solid #ccc", backgroundColor: "#fafafa" }}>
          <Button
            startIcon={<HistoryIcon />}
            fullWidth
            variant="contained"
            onClick={() => setDrawerOpen(true)}
            sx={{ mb: 2, backgroundColor: "#1a237e" }}
          >
            Show History
          </Button>
          <Button
            startIcon={<UploadFileIcon />}
            fullWidth
            variant="contained"
            component="label"
            sx={{ backgroundColor: "#1a237e" }}
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
              <Typography sx={{ color: "#757575" }}>No files selected.</Typography>
            )}
          </Box>
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
                      ? "0 10px 20px rgb(0, 131, 237)"
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

          <Button
            variant="contained"
            disabled={loading}
            onClick={handleSummarize}
            sx={{ backgroundColor: "#1a237e" }}
          >
            {loading ? <CircularProgress color="inherit" size={24} /> : "Summarize"}
          </Button>

          {errorMsg && <Alert severity="error" sx={{ mt: 3 }}>{errorMsg}</Alert>}

          {/* Display live or selected summary */}
          <Box sx={{ mt: 4 }}>
            {selectedSummary ? (
              <Box sx={{ mb: 3 }}>
                <Chip label={`Summary of "${selectedSummary.filename}"`} sx={{ mb: 1, backgroundColor: "#ffb74d" }} />
                <Chip label={`Model: ${JSON.parse(selectedSummary.metadata).model}`} sx={{ mb: 1, ml: 1, backgroundColor: "#c5e1a5" }} />
                <Chip label={new Date(selectedSummary.created_at).toLocaleString()} sx={{ mb: 1, ml: 1, backgroundColor: "#ffb74d" }} />
                <Card variant="outlined">
                  <CardContent>
                    <Typography sx={{ whiteSpace: "pre-wrap" }}>{selectedSummary.summary}</Typography>
                  </CardContent>
                </Card>
                <Button
                  variant="contained"
                  sx={{ mt: 1, backgroundColor: "#1a237e" }}
                  onClick={() => { navigator.clipboard.writeText(selectedSummary.summary); }}
                >
                  Copy
                </Button>
                <Button
                  variant="outlined"
                  sx={{ mt: 1, ml: 1, borderColor: "#1a237e", color: "#1a237e" }}
                  onClick={() => {
                    const doc = new jsPDF();
                    doc.text(selectedSummary.summary, 10, 10, { maxWidth: 190 });
                    doc.save(`${selectedSummary.filename}.pdf`);
                  }}
                >
                  Download PDF
                </Button>
                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6">Ethical Considerations</Typography>
                    {(() => {
                      const md = JSON.parse(selectedSummary.metadata);
                      const report = md.detox_report || {};
                      const summary = md.detox_summary || {};
                      const labels = Object.keys(summary);

                      return (
                        <>
                        <TableContainer component={Paper} sx={{ mt: 1 }}>
                          <Table
                            id="ethics-table"
                            size="small"
                            sx={{
                              tableLayout: 'fixed',
                              width: '100%'
                            }}
                          >
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ width: '25%' }}>Category</TableCell>
                                <TableCell sx={{ width: '25%' }} align="right">Report Text</TableCell>
                                <TableCell sx={{ width: '25%' }} align="right">Summary</TableCell>
                                <TableCell sx={{ width: '25%' }} align="right">Difference</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {labels.map(lbl => {
                                const reportVal  = Number(((report[lbl]  || 0) * 100).toFixed(4));
                                const summaryVal = Number(((summary[lbl] || 0) * 100).toFixed(4));
                                const diff       = Number((summaryVal - reportVal).toFixed(4));
                                return (
                                  <TableRow key={lbl}>
                                    <TableCell>{lbl.replace(/_/g,' ')}</TableCell>
                                    <TableCell align="right">{reportVal.toFixed(4)}%</TableCell>
                                    <TableCell align="right">{summaryVal.toFixed(4)}%</TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{ color: diff <= 0 ? 'success.main' : 'error.main' }}
                                    >
                                      {diff > 0 ? '+' : ''}{diff.toFixed(4)}%
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {/* Overall row (average) */}
                              <TableRow>
                                <TableCell><strong>Overall</strong></TableCell>
                                {(() => {
                                  const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
                                  const rs = labels.map(l=>report[l]*100), ss = labels.map(l=>summary[l]*100);
                                  const or = avg(rs), os = avg(ss), od = os - or;
                                  return [or, os, od].map((v,i) => (
                                    <TableCell key={i} align="right">
                                      <strong>
                                        {i<2 ? v.toFixed(1)+'%' : (od>0?'+':'')+od.toFixed(1)+'%'}
                                      </strong>
                                    </TableCell>
                                  ))
                                })()}
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>

                        {/* Infographic below the table */}
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="h6">Ethical Scores Chart</Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={labels.map(lbl => ({
                                name: lbl.replace(/_/g, ' '),
                                Report: (report[lbl]        || 0) * 100,
                                Summary: (summary[lbl] || 0) * 100
                              }))}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis unit="%" />
                              <Tooltip formatter={val => `${val.toFixed(2)}%`} />
                              <Legend />
                              <Bar dataKey="Report" fill="#8884d8" />
                              <Bar dataKey="Summary" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </Box>
            ) : (
              summaries.length > 0 &&
              summaries.map((s, i) => {
                // if this file failed the 2500-word check, show an error card
                if (s.error) {
                  return (
                    <Card key={i} variant="outlined" sx={{ mb: 2, borderColor: "error.main" }}>
                      <CardContent>
                        <Typography variant="subtitle1">{s.filename}</Typography>
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {s.error}
                        </Alert>
                      </CardContent>
                    </Card>
                  );
                }

                // else render the normal summary card
                const report        = s.metadata.detox_report   || {};
                const summaryScores = s.metadata.detox_summary  || {};
                const labels        = Object.keys(summaryScores);

                return (
                  <Box key={i} sx={{ mb: 3 }}>
                    <Chip label={`Summary of "${s.filename}"`} sx={{ mb: 1, backgroundColor: "#ffb74d" }} />
                    <Chip
                      label={`Model "${s.metadata.model}"`}
                      sx={{ mb: 1, backgroundColor: "#c5e1a5" }}
                    />
                    <Card variant="outlined">
                      <CardContent>
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>{s.summary}</Typography>
                      </CardContent>
                    </Card>
                    <Button
                      variant="contained"
                      sx={{ mt: 1, backgroundColor: "#1a237e" }}
                      onClick={() => navigator.clipboard.writeText(s.summary)}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="outlined"
                      sx={{ mt: 1, ml: 1, borderColor: "#1a237e", color: "#1a237e" }}
                      onClick={() => {
                        const doc = new jsPDF();
                        doc.text(s.summary, 10, 10, { maxWidth: 190 });
                        doc.save(`${s.filename}_summary.pdf`);
                      }}
                    >
                      Download PDF
                    </Button>
                    <Typography
                      variant="subtitle1"
                      sx={{ mt: 2 }}
                    >
                      Ethical Considerations
                    </Typography>
                    {(() => {
                      const report = s.metadata.detox_report || {};
                      const summaryScores = s.metadata.detox_summary || {};
                      const labels = Object.keys(summaryScores);

                      return (
                        <TableContainer component={Paper} sx={{ mt: 1 }}>
                          <Table
                            id={`ethics-table-${i}`}
                            size="small"
                            sx={{ tableLayout: 'fixed', width: '100%' }}
                          >
                            <TableHead>
                              <TableRow>
                                <TableCell>Category</TableCell>
                                <TableCell align="right">
                                  Report Text
                                </TableCell>
                                <TableCell align="right">Summary</TableCell>
                                <TableCell align="right">Difference</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {labels.map(lbl => {
                                const r  = Number(((report[lbl]         || 0) * 100).toFixed(4));
                                const sC = Number(((summaryScores[lbl] || 0) * 100).toFixed(4));
                                const d  = Number((sC - r).toFixed(4));
                                return (
                                  <TableRow key={lbl}>
                                    <TableCell>{lbl.replace(/_/g, ' ')}</TableCell>
                                    <TableCell align="right">{r.toFixed(4)}%</TableCell>
                                    <TableCell align="right">{sC.toFixed(4)}%</TableCell>
                                    <TableCell
                                      align="right"
                                      // green when d ≤ 0 (i.e. reduction or no change), red when d > 0
                                      sx={{ color: d <= 0 ? 'success.main' : 'error.main' }}
                                    >
                                      {d > 0 ? '+' : ''}{d.toFixed(4)}%
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                              {/* Overall row (average) */}
                              <TableRow>
                                <TableCell><strong>Overall</strong></TableCell>
                                {(() => {
                                  const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
                                  const rs = labels.map(l=>report[l]*100), ss = labels.map(l=>summaryScores[l]*100);
                                  const or = avg(rs), os = avg(ss), od = os - or;
                                  return [or, os, od].map((v,i) => (
                                    <TableCell key={i} align="right">
                                      <strong>
                                        {i<2 ? v.toFixed(1)+'%' : (od>0?'+':'')+od.toFixed(1)+'%'}
                                      </strong>
                                    </TableCell>
                                  ))
                                })()}
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                        
                      );
                    })()}

                    {/* Infographic below the table */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h6">Ethical Scores Chart</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={labels.map(lbl => ({
                            name: lbl.replace(/_/g, ' '),
                            Report:  (report[lbl]        || 0) * 100,
                            Summary: (summaryScores[lbl] || 0) * 100
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis unit="%" />
                          <Tooltip formatter={val => `${val.toFixed(2)}%`} />
                          <Legend />
                          <Bar dataKey="Report" fill="#8884d8" />
                          <Bar dataKey="Summary" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Paper>
      </Box>

      {/* History Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box
          sx={{ width: 280 }}
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
