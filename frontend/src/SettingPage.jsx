import React, { useState } from "react";
import {
  Box, Paper, Typography, TextField,
  Button, Alert
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const SettingPage = ({ user }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: user.username,
    fullName: user.fullName || "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (form.newPassword !== form.confirmNewPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Update failed.");
      }
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Settings</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="Current Password"
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            fullWidth sx={{ mb: 2 }}
            required
          />
          <TextField
            label="New Password"
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="Confirm New Password"
            name="confirmNewPassword"
            type="password"
            value={form.confirmNewPassword}
            onChange={handleChange}
            fullWidth sx={{ mb: 3 }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Button type="submit" variant="contained" color="primary">
              Save Changes
            </Button>
            <Button variant="outlined" onClick={() => navigate("/upload")}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingPage;