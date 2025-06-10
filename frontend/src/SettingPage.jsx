import React, { useState, useEffect } from "react";
import {
    Box, Container, Paper, Stack, Avatar, Divider,
    Typography, TextField, Button, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const SettingPage = ({ user }) => {
    const navigate = useNavigate();

    const [profile, setProfile] = useState({
        username: user?.username  || "",
        fullName: user?.fullName  || "",
        email:    user?.email     || ""
    });
    useEffect(() => {
        if (user) {
            setProfile({
                username: user.username,
                fullName: user.fullName || "",
                email:    user.email    || ""
            });
        }
    }, [user]);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword:     "",
        confirmNewPassword: ""
    });
    const [error, setError]     = useState("");
    const [success, setSuccess] = useState("");
    const [showProfileDialog, setShowProfileDialog]   = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);

    // On mount we try GET /settings, but if 401 we fall back to user prop
    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:8000/settings", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) {
                // token no longer valid (username changed) → fall back
                setProfile({
                    username: user.username,
                    fullName: user.fullName  || "",
                    email:    user.email     || ""
                });
                return;
            }
            if (!res.ok) throw new Error();
            const data = await res.json();
            setProfile({
                username: data.username,
                fullName: data.full_name || "",
                email:    data.email     || ""
            });
        };
        fetchProfile();
    }, [user]);

    const handleProfileChange = e =>
        setProfile({ ...profile, [e.target.name]: e.target.value });
    const handlePasswordChange = e =>
        setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

    const openProfileDialog = () => {
        setError(""); setSuccess("");
        setPasswordForm({ ...passwordForm, currentPassword: "" });
        setShowProfileDialog(true);
    };
    const closeProfileDialog = () => setShowProfileDialog(false);
    const openPasswordDialog = () => {
        setError(""); setSuccess("");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
        setShowPasswordDialog(true);
    };
    const closePasswordDialog = () => setShowPasswordDialog(false);

    const handleSaveProfile = async () => {
        setError(""); setSuccess("");
        if (!passwordForm.currentPassword) {
            setError("Please enter current password"); return;
        }
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:8000/settings", {
                method: "PUT",
                headers: {
                    "Content-Type":"application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    username:       profile.username,
                    full_name:      profile.fullName,
                    email:          profile.email,
                    currentPassword: passwordForm.currentPassword
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail||"Update failed");

            // 1) Update local state
            setProfile({
                username: data.username,
                fullName: data.full_name || "",
                email:    data.email      || ""
            });
            // 2) Persist to localStorage so we don’t lose it on 401
            localStorage.setItem("username", data.username);
            localStorage.setItem("fullName", data.full_name || "");
            localStorage.setItem("email", data.email);
            // 3) (Optional) If backend returned a fresh token, overwrite it:
            if (data.access_token) {
                localStorage.setItem("token", data.access_token)
            }

            setSuccess("Profile updated");
            closeProfileDialog();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleChangePassword = async () => {
        setError("");
        if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
            setError("New passwords do not match.");
            return;
        }
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:8000/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(passwordForm)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Password change failed.");
            }
            setSuccess("Password changed successfully.");
            closePasswordDialog();
        } catch (err) {
            setError(err.message);
        }
    };

    const labelStyle = {
        shrink: true,
        sx: {
            backgroundColor: "#fff",
            px: 0.5
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor:   "background.default",
                display:   "flex",
                alignItems:     "center",
                justifyContent: "center",
                py: 4
            }}
        >
            <Container maxWidth="xs">
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 1 }}>
                    <Stack alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: "primary.main", width: 72, height: 72 }}>
                            {profile.fullName?.[0] || profile.username?.[0]}
                        </Avatar>
                        <Typography variant="h5" sx={{ letterSpacing: 1 }}>
                            Account Settings
                        </Typography>
                    </Stack>
                    <Divider sx={{ mb: 3 }} />

                    {error   && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    <TextField
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        label="Username"
                        name="username"
                        value={profile.username}
                        onChange={handleProfileChange}
                        sx={{ mb: 2 }}
                        InputLabelProps={labelStyle}
                    />
                    <TextField
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        label="Full Name"
                        name="fullName"
                        value={profile.fullName}
                        onChange={handleProfileChange}
                        sx={{ mb: 2 }}
                        InputLabelProps={labelStyle}
                    />
                    <TextField
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        label="Email"
                        name="email"
                        value={profile.email}
                        onChange={handleProfileChange}
                        helperText="We’ll never share your email."
                        sx={{ mb: 3 }}
                        InputLabelProps={labelStyle}
                    />

                    <Stack direction="row" justifyContent="flex-end" spacing={2}>
                        <Button variant="contained" onClick={openProfileDialog}>
                            Save Changes
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={openPasswordDialog}>
                            Change Password
                        </Button>
                    </Stack>

                    <Box sx={{ mt: 2, textAlign: "right" }}>
                        <Button variant="text" onClick={() => navigate("/upload")}>
                            Cancel
                        </Button>
                    </Box>
                </Paper>
            </Container>

            {/* Confirm Profile Changes */}
            <Dialog open={showProfileDialog} onClose={closeProfileDialog}>
                <DialogTitle>Confirm Profile Changes</DialogTitle>
                <DialogContent>
                    <TextField
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        label="Current Password"
                        name="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        sx={{ mb: 2 }}
                        InputLabelProps={labelStyle}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeProfileDialog}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveProfile}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Change Password */}
            <Dialog open={showPasswordDialog} onClose={closePasswordDialog}>
                <DialogTitle>Change Password</DialogTitle>
                <DialogContent>
                    <TextField
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        label="Current Password"
                        name="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        sx={{ mb: 2 }}
                        InputLabelProps={labelStyle}
                    />
                    <TextField
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        label="New Password"
                        name="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        sx={{ mb: 2 }}
                        InputLabelProps={labelStyle}
                    />
                    <TextField
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        label="Confirm New Password"
                        name="confirmNewPassword"
                        type="password"
                        value={passwordForm.confirmNewPassword}
                        onChange={handlePasswordChange}
                        InputLabelProps={labelStyle}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closePasswordDialog}>Cancel</Button>
                    <Button variant="contained" onClick={handleChangePassword}>
                        Change
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SettingPage;