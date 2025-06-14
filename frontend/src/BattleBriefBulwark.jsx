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
  LinearProgress,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Menu,
  ListItemIcon,
  Tooltip as MuiTooltip,   // avoid name clash
  Stack
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import HistoryIcon from "@mui/icons-material/History";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SettingsIcon from "@mui/icons-material/Settings";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import ReactMarkdown from "react-markdown";

const supportedFileTypes = [".txt", ".pdf", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mb

// const UploadPage = ({ user }) => {
const BattleBriefBulwark = ({ user }) => {
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
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  // Ranking state
  const [rankingCriterion, setRankingCriterion] = useState("overall");
  const [modelStats, setModelStats] = useState([]);

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
      console.log("Fetched summaries:", data);
      const parsed = (data.summaries || []).map(item => ({
        ...item,
        metadata: typeof item.metadata === "string"
          ? JSON.parse(item.metadata)
          : item.metadata
      }));
      console.log("Parsed summaries:", parsed);
      setStoredSummaries(parsed);
    } catch (e) {
      console.error("fetchStoredSummaries:", e);
    }
  }

  useEffect(() => {
    fetchStoredSummaries();
  }, []);

  // Recompute model stats whenever storedSummaries changes
  useEffect(() => {
    const stats = {};

    storedSummaries.forEach(item => {
      const modelName = item.metadata?.model || "Unknown";
      const scores = item.metadata?.quality_scores;
      if (!scores) return;

      if (!stats[modelName]) {
        stats[modelName] = { count: 0, sums: {} };
      }
      stats[modelName].count++;

      Object.entries(scores).forEach(([crit, det]) => {
        // normalize key to lowercase
        const key = crit.toLowerCase();
        const score = det?.score ?? 0;
        stats[modelName].sums[key] = (stats[modelName].sums[key] || 0) + score;
      });
    });

    const arr = Object.entries(stats).map(([model, { count, sums }]) => {
      const averages = {};
      // average = sum of scores ÷ number of summaries
      Object.entries(sums).forEach(([crit, totalScore]) => {
        averages[crit] = totalScore / count;
      });
      // ensure all five criteria exist
      ["consistency","coverage","coherence","fluency","overall"].forEach(c => {
        if (!(c in averages)) averages[c] = 0;
      });
      return { model, count, averages };
    });

    setModelStats(arr);
  }, [storedSummaries]);

  const handleSummarize = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSelectedSummary(null);
    setSummaries([]);
    if (!files.length && !manualText.trim()) {
      alert("Select file or enter text!");
      return;
    }
    const username = localStorage.getItem("username");
    if (!username) return navigate("/login");

    setLoading(true);

    // build a list: first any manualText blob, then the real files
    const toSubmit = [];
    if (manualText.trim()) {
      const ts = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");
      const blob = new Blob([manualText], { type: "text/plain" });
      const txtFile = new File(
        [blob],
        `clipboard-${ts}.txt`,
        { type: "text/plain" }
      );
      toSubmit.push(txtFile);
    }
    toSubmit.push(...files);

    for (const f of toSubmit) {
      const form = new FormData();
      form.append("user_id", username);
      form.append("model", model);
      form.append("files", f);

      try {
        const res = await fetch("http://localhost:8000/summarize", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        const [filename, value] = Object.entries(data)[0];
        const created_at = new Date().toISOString();
        const item = typeof value === "string"
          ? { filename, summary: null, metadata: null, error: value, created_at }
          : {
              filename,
              summary: value.summary,
              metadata: typeof value.metadata === "string"
                ? JSON.parse(value.metadata)
                : value.metadata,
              error: null,
              created_at,
            };
      setSummaries((prev) => [...prev, item]);
      } catch (err) {
        console.error(err);
      }
    }

    setLoading(false);
    fetchStoredSummaries();
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
    // always show full history, newest first
    const sorted = [...storedSummaries].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return (
      <Box sx={{ width: 300, p: 2 }}>
        <Typography variant="h6">Summary History</Typography>
        <Divider sx={{ mb: 2 }} />

        {sorted.length === 0 ? (
          <Typography>No summaries available.</Typography>
        ) : (
          <List>
            {sorted.map(item => {
              // find logo, etc—exactly as before
              const opt = modelOptions.find(o => o.value === item.metadata?.model);
              const logoSrc = opt?.logo.replace('.gif', '.png') || "";

              return (
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
                      onClick={e => {
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
                        <span>{item.summary.slice(0, 20)}…</span><br/>
                        <small>{new Date(item.created_at).toLocaleString()}</small><br/>
                        <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
                          {logoSrc && (
                            <img src={logoSrc} alt={item.metadata.model} width={30} height={20} style={{ marginRight: 6 }} />
                          )}
                          <span>{item.metadata.model}</span>
                        </Box>
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    );
  };

  // decide which list to draw: either the clicked history item or live summaries
  const displayList = selectedSummary ? [selectedSummary] : summaries;

  // derive options from storedSummaries
  const historyOptions = storedSummaries.map(item => ({
    label: `${item.filename} — ${new Date(item.created_at).toLocaleString()} — ${item.metadata?.model}`,
    item
  }));

  const handleUserMenuOpen = (e) => setUserMenuAnchor(e.currentTarget);
  const handleUserMenuClose = () => setUserMenuAnchor(null);
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
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

        {/* ← your existing Autocomplete */}
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Autocomplete
            freeSolo
            disableOpenOnFocus
            options={searchTerm.length > 0 ? historyOptions : []}
            filterOptions={(opts, { inputValue }) =>
              opts.filter(opt => {
                const term = inputValue.toLowerCase();
                // match on filename/date (opt.label) OR on model
                return opt.label.toLowerCase().includes(term)
                  || opt.item.metadata?.model.toLowerCase().includes(term);
              })
            }
            getOptionLabel={opt => opt.label}
            inputValue={searchTerm}
            onInputChange={(e, v) => setSearchTerm(v)}
            onChange={(e, opt) => {
              if (opt?.item) {
                setSelectedSummary(opt.item);
                setSearchTerm("");
              }
            }}
            sx={{ width: 650 }}
            renderInput={params => (
              <TextField
                {...params}
                size="large"
                variant="outlined"
                placeholder="Search past summaries…"
              />
            )}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", pr: 4, gap: 2 }}>
          <Button
            onClick={handleUserMenuOpen}
            endIcon={<ExpandMoreIcon />}
            sx={{ textTransform: "none" }}
          >
            <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
              {user.username[0].toUpperCase()}
            </Avatar>
            {user.username}
          </Button>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem
              onClick={() => {
                handleUserMenuClose();
                handleLogout();
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
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

          <Divider sx={{ my: 2 }} />
          <Card sx={{ mb:2, p:2, backgroundColor:'background.paper' }}>
            <Box sx={{ display:'flex', alignItems:'center', mb:2 }}>
              <SettingsIcon fontSize="small" sx={{ mr:1, color:'primary.main' }}/>
              <Typography variant="h6" sx={{ fontWeight:'medium' }}>
                Model Performance
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ mb:2, display:'flex', alignItems:'baseline' }}>
              Total Summaries:&nbsp;
              <Typography component="span" variant="h6" sx={{ fontWeight:'bold', ml:.5 }}>
                {storedSummaries.length}
              </Typography>
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb:3 }}>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={rankingCriterion}
                label="Sort by"
                onChange={e => setRankingCriterion(e.target.value)}
              >
                <MenuItem value="overall">Overall</MenuItem>
                <MenuItem value="consistency">Consistency</MenuItem>
                <MenuItem value="coverage">Coverage</MenuItem>
                <MenuItem value="coherence">Coherence</MenuItem>
                <MenuItem value="fluency">Fluency</MenuItem>
              </Select>
            </FormControl>
          </Card>

          {modelStats
            .sort((a,b) => b.averages[rankingCriterion] - a.averages[rankingCriterion])
            .map(ms => {
              const opt = modelOptions.find(o => o.value===ms.model);
              const logoSrc = opt?.logo.replace('.gif','.png')||"";
              const avg = (ms.averages[rankingCriterion] || 0).toFixed(2)
              const pct = (ms.averages[rankingCriterion] || 0) / 10 * 100;

              return (
                <Accordion key={ms.model} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '84px 1fr',
                        rowGap: 0.1,
                        alignItems: 'start',
                        width: '100%'
                      }}
                    >
                      {/* single avatar spans all three rows */}
                      <Avatar
                        variant="square"
                        fullWidth
                        src={logoSrc}
                        alt={ms.model}
                        sx={{ gridRow: '1 / 4', width: 70, height: 50, borderRadius: 1 }}
                      />

                      {/* Row 1: Model name */}
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                      >
                        {ms.model}
                      </Typography>

                      {/* Row 2: count : criterion : score */}
                      <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                        <Typography
                          component="span"
                          variant="h5"
                          sx={{ fontWeight: 'bold', mr: 1, lineHeight: 1 }}
                        >
                          {ms.count}
                        </Typography>
                        <Typography component="span" variant="body2" textTransform="capitalize">
                          {rankingCriterion}: {avg}
                        </Typography>
                      </Box>

                      {/* Row 3: progress bar */}
                      <Box sx={{ width: '100%' }}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails>
                    {["overall","consistency","coverage","coherence","fluency"].map(crit => {
                      const score = (ms.averages[crit]||0).toFixed(2);
                      const bar = (ms.averages[crit]||0)/10*100;
                      return (
                        <Box key={crit} sx={{ display:"flex", alignItems:"center", mb:1 }}>
                          <Typography sx={{ width:90, textTransform:"capitalize" }}>
                            {crit}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={bar}
                            sx={{ flexGrow:1, mx:1, height:6, borderRadius:3 }}
                          />
                          <Typography variant="body2" sx={{ width:40, textAlign:"right" }}>
                            {score}/10
                          </Typography>
                        </Box>
                      );
                    })}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          {/* ===== end Model Ranking Section ====== */}

          <Button
            startIcon={<SettingsIcon />}
            fullWidth
            variant="outlined"
            color="secondary"
            sx={{ mt: 'auto' }}
            onClick={() => navigate("/settings")}
          >
            Settings
          </Button>
        </Box>

        {/* Main */}
        <Paper elevation={3} sx={{ flex: 1, p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Select Model</Typography>

          <Grid
            container
            spacing={2}
            wrap="nowrap"                // ← prevent wrapping so it’s always 1 row
            sx={{ mb: 3, width: '100%' }} 
          >
            {modelOptions.map(opt => (
              <Grid
                item
                key={opt.value}
                sx={{ flexGrow: 1, display: 'flex' }}   // ← each item flex-grows equally
              >
                <Box
                  onClick={() => setModel(opt.value)}
                  sx={{
                    flex: 1,            // fill that Grid slot
                    minWidth: 0,        // allow content to shrink
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    p: 2,
                    border: 1,
                    borderColor: model === opt.value ? 'primary.main' : 'grey.300',
                    borderRadius: 1,
                    cursor: 'pointer',
                    backgroundColor:
                      model === opt.value ? 'primary.light' : 'background.paper',
                    boxShadow:
                      model === opt.value
                        ? '0 10px 20px rgba(196, 255, 3, 0.58)'
                        : 'none',
                    transition: 'box-shadow 0.2s ease',
                    '@keyframes vibrate': {
                      "0%":   { transform: "translate(0)" },
                      "20%":  { transform: "translate(-2px, 2px)" },
                      "40%":  { transform: "translate(-2px, -2px)" },
                      "60%":  { transform: "translate(2px, 2px)" },
                      "80%":  { transform: "translate(2px, -2px)" },
                      "100%": { transform: "translate(0)" }
                    },
                    animation:
                      loading && model === opt.value
                        ? 'vibrate 0.9s linear infinite'
                        : 'none'
                  }}
                >
                  <img
                    src={opt.logo}
                    alt={opt.name}
                    style={{
                      width: '100%',    // ← always fill available width
                      height: 'auto',
                      maxHeight: 160    // cap the height
                    }}
                  />
                  <Typography sx={{ mt: 1, textAlign: 'center' }}>
                    {opt.name}
                  </Typography>
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
            onChange={e => setManualText(e.target.value)}
          />

          {/* Summarize Button */}
          <Button
            variant="contained"
            disabled={loading}
            onClick={handleSummarize}
          >
            {loading
              ? <CircularProgress size={24} sx={{ color: t=>t.palette.common.white }} />
              : "Summarize"
            }
          </Button>

          {/* === new: display ALL live summaries with full detail === */}
          {displayList.length > 0 && (
            <Box sx={{ mt: 4 }}>
              {displayList.map(item => (
                <Box key={item.filename} sx={{ mb: 5, p: 2, border: 1, borderColor: "grey.300", borderRadius: 1 }}>
                  {/* Header chips */}
                  <Chip
                    label={`Summary of "${item.filename}"`}
                    sx={{ mb: 1, backgroundColor: theme => theme.palette.warning.main }}
                  />
                  <Chip
                    label={`Model: ${item.metadata?.model}`}
                    sx={{ mb: 1, ml: 1, backgroundColor: theme => theme.palette.success.light }}
                  />
                  <Chip
                    label={new Date(item.created_at).toLocaleString()}
                    sx={{ mb: 1, ml: 1, backgroundColor: "#ffb74d" }}
                  />

                  {/* Summary text */}
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography>
                        {item.summary || <Alert severity="error">{item.error}</Alert>}
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* Copy & PDF */}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => navigator.clipboard.writeText(item.summary || "")}
                    sx={{ mr: 1 }}
                  >
                    Copy
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const doc = new jsPDF();
                      doc.text(item.summary || "", 10, 10, { maxWidth: 190 });
                      doc.save(`${item.filename}.pdf`);
                    }}
                  >
                    Download PDF
                  </Button>

                  {/* only show all the detail tables/charts if metadata is present */}
                  {item.metadata && (
                    <>
                      {/* Quality Scores */}
                      <Typography variant="h6" sx={{ mt: 4 }}>Quality Scores</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
                        <TableContainer component={Paper} sx={{ flex: 2, maxWidth: "70%", mr: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Criteria</TableCell>
                                <TableCell align="right">Score</TableCell>
                                <TableCell>Justification</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {Object.entries(item.metadata.quality_scores).map(([c,d]) => (
                                <TableRow key={c}>
                                  <TableCell>{c}</TableCell>
                                  <TableCell align="right">{d.score}</TableCell>
                                  <TableCell>{d.justification}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Box sx={{ flex: 1, maxWidth: "30%" }}>
                          {/* Pie chart */}
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={Object.entries(item.metadata.quality_scores || {}).map(([name, det]) => ({
                                  name,
                                  value: det.score
                                }))}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={90}
                                label
                              >
                                {Object.entries(item.metadata.quality_scores || {}).map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={["#ffb74d", "#82ca9d", "#8884d8", "#ffc658", "#d0ed57"][i % 5]}
                                  />
                                ))}
                              </Pie>
                              <RechartsTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                      </Box>

                      {/* Ethical Considerations */}
                      <Typography variant="h6" sx={{ mt: 4 }}>Ethical Considerations</Typography>
                      <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Category</TableCell>
                              <TableCell>Report (%)</TableCell>
                              <TableCell>Summary (%)</TableCell>
                              <TableCell>Difference</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.keys(item.metadata.detox_report).map(cat => {
                              const rep = (item.metadata.detox_report[cat] || 0) * 100;
                              const sum = (item.metadata.detox_summary[cat] || 0) * 100;
                              const diff = (sum - rep).toFixed(2);
                              return (
                                <TableRow key={cat}>
                                  <TableCell>{cat.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</TableCell>
                                  <TableCell>{rep.toFixed(2)}</TableCell>
                                  <TableCell>{sum.toFixed(2)}</TableCell>
                                  <TableCell sx={{ color: diff<=0?"green":"red" }}>{diff}</TableCell>
                                </TableRow>
                              );
                            })}
                            {/* Overall row */}
                            <TableRow>
                              <TableCell><strong>Overall</strong></TableCell>
                              <TableCell>
                                {(
                                  Object.values(item.metadata.detox_report||{}).reduce((a,v)=>a+v,0) / 
                                  Object.keys(item.metadata.detox_report||{}).length * 100
                                ).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {(
                                  Object.values(item.metadata.detox_summary||{}).reduce((a,v)=>a+v,0) / 
                                  Object.keys(item.metadata.detox_summary||{}).length * 100
                                ).toFixed(2)}
                              </TableCell>
                              <TableCell sx={{
                                color: (
                                  Object.keys(item.metadata.detox_report||{}).reduce((acc,cat) => {
                                    return acc + ((item.metadata.detox_summary[cat]||0) - (item.metadata.detox_report[cat]||0));
                                  },0) / Object.keys(item.metadata.detox_report||{}).length * 100
                                ) <= 0 ? "green":"red"
                              }}>
                                {(
                                  Object.keys(item.metadata.detox_report||{}).reduce((acc,cat) => {
                                    return acc + ((item.metadata.detox_summary[cat]||0) - (item.metadata.detox_report[cat]||0));
                                  },0) / Object.keys(item.metadata.detox_report||{}).length * 100
                                ).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Toxicity Comparison */}
                      <Typography variant="h6" sx={{ mt: 4 }}>Toxicity Comparison</Typography>
                      <ResponsiveContainer width="100%" height={250} sx={{ mt: 2 }}>
                        <BarChart
                          data={Object.keys(item.metadata.detox_report||{}).map(cat => ({
                            aspect: cat.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()),
                            report: +(item.metadata.detox_report[cat]*100).toFixed(2),
                            summary: +(item.metadata.detox_summary[cat]*100).toFixed(2)
                          }))}
                        >
                          <XAxis dataKey="aspect" />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey="report" fill="#8884d8" name="Report" />
                          <Bar dataKey="summary" fill="#82ca9d" name="Summary" />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </Box>
              ))}
            </Box>
          )}
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

export default BattleBriefBulwark;
