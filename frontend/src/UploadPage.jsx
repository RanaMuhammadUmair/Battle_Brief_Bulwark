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
  TableRow
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";

const supportedFileTypes = [".txt", ".pdf", ".docx"];

const UploadPage = ({ user }) => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [manualText, setManualText] = useState("");
  const [model, setModel] = useState("T5");
  const [summaries, setSummaries] = useState([]);
  const [storedSummaries, setStoredSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);

  // File change
  const handleFileChange = (e) => {
    const valid = Array.from(e.target.files).filter((f) => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!supportedFileTypes.includes(ext)) {
        alert(`"${f.name}" not supported.`);
        return false;
      }
      return true;
    });
    setFiles(valid);
    setSelectedSummary(null);
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
    if (!files.length && !manualText.trim()) {
      alert("Select file or enter text!");
      return;
    }
    const username = localStorage.getItem("username");
    if (!username) return navigate("/login");

    setLoading(true);
    setSelectedSummary(null);
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    if (manualText.trim()) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      form.append("files", new File([manualText], `clipboard-${ts}.txt`));
    }
    form.append("model", model);
    form.append("user_id", username);

    try {
      const res = await fetch("http://localhost:8000/summarize", { method: "POST", body: form });
      const result = await res.json();
      const live = Object.entries(result).map(([filename, { summary, metadata }]) => ({
        filename,
        summary,
        metadata
      }));
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
        <Button onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
          sx={{ backgroundColor: "#1a237e" }}
          variant="contained"
        >
          Logout
        </Button>
      </Box>

      <Box sx={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <Box sx={{ width: 250, p: 2, borderRight: "1px solid #ccc", backgroundColor: "#fafafa" }}>
          <Button fullWidth variant="contained" onClick={() => setDrawerOpen(true)} sx={{ mb: 2, backgroundColor: "#1a237e" }}>
            Show History
          </Button>
          <Button fullWidth variant="contained" component="label" sx={{ backgroundColor: "#1a237e" }}>
            Select Files
            <input hidden multiple type="file" onChange={handleFileChange} />
          </Button>
          <Box sx={{ mt: 2 }}>
            {files.length
              ? files.map((f, i) => (
                  <Typography key={i} sx={{ color: "#757575" }}>
                    {f.name}
                  </Typography>
                ))
              : <Typography sx={{ color: "#757575" }}>No files selected.</Typography>}
          </Box>
        </Box>

        {/* Main */}
        <Paper elevation={3} sx={{ flex: 1, p: 4 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Model</InputLabel>
            <Select value={model} label="Model" onChange={(e) => setModel(e.target.value)}>
              <MenuItem value="GPT-4.1">GPT-4.1</MenuItem>
              <MenuItem value="BART">BART</MenuItem>
              <MenuItem value="CLAUDE">CLAUDE</MenuItem>
              <MenuItem value="T5">T5</MenuItem>
              <MenuItem value="Gemini 2.5 Pro">Gemini 2.5 Pro</MenuItem>
              <MenuItem value="DeepSeek-R1">DeepSeek-R1</MenuItem>
              <MenuItem value="Llama 3.1">Llama 3.1</MenuItem>
            </Select>
          </FormControl>

          <TextField
            multiline
            rows={4}
            fullWidth
            label="Or enter text"
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
                      );
                    })()}
                  </CardContent>
                </Card>
              </Box>
            ) : (
              summaries.length > 0 &&
              summaries.map((s, i) => {
                const report        = s.metadata.detox_report || {};
                const summaryScores = s.metadata.detox_summary || {};
                const labels        = Object.keys(summaryScores);

                return (
                  <Box key={i} sx={{ mb: 3 }}>
                    <Chip label={`Summary of "${s.filename}"`} sx={{ mb: 1, backgroundColor: "#ffb74d" }} />
                    <Chip label={`Model "${s.metadata && s.metadata.model ? s.metadata.model : (JSON.parse(s.metadata || "{}").model || "N/A")}"`} sx={{ mb: 1, backgroundColor: "#c5e1a5" }} />
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
          sx={{ width: 300 }}
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
