import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Grid, Paper } from "@mui/material";

const SummariesPage = () => {
  const [summaries, setSummaries] = useState([]);

  useEffect(() => {
    const fetchSummaries = async () => {
      const response = await fetch("http://localhost:8000/summaries");
      const data = await response.json();
      setSummaries(data.summaries);
    };

    fetchSummaries();
  }, []);

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", color: "#1a237e" }}>
        Summaries
      </Typography>
      <Grid container spacing={3}>
        {summaries.map((summary, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ backgroundColor: "#e8eaf6", borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                  {summary.filename}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Model: {summary.model}
                </Typography>
                <Typography variant="body1" sx={{ mt: 2, whiteSpace: "pre-wrap" }}>
                  {summary.summary}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default SummariesPage;
