/**
 * Account Settings Page Component
 * 
 * This component provides a user profile management interface with:
 * - Profile information display and editing (username, full name, email)
 * - Password change functionality with current password verification
 * - Form validation and error handling
 * - JWT token management for authenticated API requests
 * - Responsive layout using Material-UI components
 */
import React, { useState, useEffect } from "react";
import {
    Box, Container, Paper, Stack, Avatar, Divider,
    Typography, TextField, Button, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { useNavigate } from "react-router-dom";

/**
 * SettingPage Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - User data passed from parent component
 * @returns {JSX.Element} - Rendered component
 */
const SettingPage = ({ user }) => {
    const navigate = useNavigate();

    /**
     * State Management
     * 
     * profile: Stores user profile information (username, fullName, email)
     * passwordForm: Manages password change form data
     * error/success: Feedback messages for user actions
     * showProfileDialog/showPasswordDialog: Control modal visibility
     */
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

    /**
     * Profile Data Fetching
     * 
     * On component mount, fetches the latest user profile from the server:
     * - Uses JWT token for authentication
     * - Falls back to props data if authentication fails
     * - Updates state with received profile information
     */
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

    /**
     * Form Change Handlers
     * 
     * Manages controlled form inputs for profile and password forms
     */
    const handleProfileChange = e =>
        setProfile({ ...profile, [e.target.name]: e.target.value });
    const handlePasswordChange = e =>
        setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

    /**
     * Dialog Management Functions
     * 
     * Controls the visibility of confirmation dialogs and resets form state
     */
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

    /**
     * Profile Update Handler
     * 
     * Saves profile changes to the server with current password verification:
     * 1. Validates current password is provided
     * 2. Submits profile update with JWT authentication
     * 3. Updates local state and localStorage with new user data
     * 4. Handles token refresh if provided by the server
     * 5. Provides success/error feedback to the user
     */
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
            // 2) Persist to localStorage so we don't lose it on 401
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

    /**
     * Password Change Handler
     * 
     * Manages password update process:
     * 1. Validates password confirmation matches
     * 2. Submits password change request with current password verification
     * 3. Provides feedback on success/failure
     */
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

    /**
     * UI Helper Styles
     * 
     * Consistent styling for form field labels
     */
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
            {/* Main Settings Container */}
            <Container maxWidth="xs">
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 1 }}>
                    {/* Header with User Avatar */}
                    <Stack alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: "primary.main", width: 72, height: 72 }}>
                            {profile.fullName?.[0] || profile.username?.[0]}
                        </Avatar>
                        <Typography variant="h5" sx={{ letterSpacing: 1 }}>
                            Account Settings
                        </Typography>
                    </Stack>
                    <Divider sx={{ mb: 3 }} />

                    {/* Error and Success Messages */}
                    {error   && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    {/* Profile Form Fields */}
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
                        helperText="We'll never share your email."
                        sx={{ mb: 3 }}
                        InputLabelProps={labelStyle}
                    />

                    {/* Action Buttons */}
                    <Stack direction="row" justifyContent="flex-end" spacing={2}>
                        <Button variant="contained" onClick={openProfileDialog}>
                            Save Changes
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={openPasswordDialog}>
                            Change Password
                        </Button>
                    </Stack>

                    {/* Navigation Link */}
                    <Box sx={{ mt: 2, textAlign: "right" }}>
                        <Button variant="text" onClick={() => navigate("/battle-brief-bulwark")}>
                            Go to summary page
                        </Button>
                    </Box>
                </Paper>
            </Container>

            {/* Profile Update Confirmation Dialog */}
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

            {/* Password Change Dialog */}
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