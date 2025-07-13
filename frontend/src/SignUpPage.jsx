/**
 * Sign Up Page Component
 * 
 * This component provides a user registration interface with:
 * - Form fields for creating a new account (username, full name, email, password)
 * - Client-side validation for password matching
 * - Error handling and feedback
 * - Navigation to login page after successful registration
 * - Responsive layout using Material-UI components
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Box, Container, Paper, Stack, Avatar, Typography,
    TextField, Button, Alert
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';

const SignUpPage = () => {
    // Navigation hook for redirection after successful registration
    const navigate = useNavigate();
    
    // Form state management for all input fields
    const [form, setForm] = useState({
        username: "", fullName: "", email: "", password: "", confirmPassword: ""
    });
    
    // Error state for validation and API errors
    const [error, setError] = useState("");

    /**
     * Generic change handler for all form fields
     * 
     * Updates the form state with the new value while preserving other field values
     * 
     * @param {Event} e - The input change event
     */
    const handleChange = e =>
        setForm({ ...form, [e.target.name]: e.target.value });

    /**
     * Handles user registration submission
     * 
     * This function:
     * 1. Prevents default form submission behavior
     * 2. Validates that passwords match
     * 3. Submits registration data to the API
     * 4. Redirects to login page on success
     * 5. Handles and displays registration errors
     * 
     * @param {Event} e - The form submission event
     */
    const handleSignUp = async e => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        try {
            const res = await fetch("http://localhost:8000/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: form.username,
                    full_name: form.fullName,
                    email: form.email,
                    password: form.password
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Sign up failed");
            }
            navigate("/login");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        /**
         * Page Layout Structure
         * 
         * The UI consists of:
         * 1. Centered container with responsive sizing
         * 2. Paper card with elevation for visual distinction
         * 3. Header with user icon and title
         * 4. Registration form with input fields
         * 5. Error feedback alert (conditional)
         * 6. Navigation link to login page
         */
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "background.default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 4
            }}
        >
            {/* Main Content Container */}
            <Container maxWidth="xs">
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 1 }}>
                    {/* Form Header with Icon and Title */}
                    <Stack alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                            <PersonAddOutlinedIcon />
                        </Avatar>
                        <Typography variant="h5" sx={{ letterSpacing: 1 }}>
                            Sign Up
                        </Typography>
                    </Stack>

                    {/* Conditional Error Alert - Only renders when validation fails */}
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {/* Registration Form */}
                    <Box component="form" onSubmit={handleSignUp} noValidate>
                        <TextField
                            name="username"
                            label="Username"
                            fullWidth
                            margin="dense"
                            value={form.username}
                            onChange={handleChange}
                        />
                        <TextField
                            name="fullName"
                            label="Full Name"
                            fullWidth
                            margin="dense"
                            value={form.fullName}
                            onChange={handleChange}
                        />
                        <TextField
                            name="email"
                            label="Email"
                            type="email"
                            fullWidth
                            margin="dense"
                            value={form.email}
                            onChange={handleChange}
                        />
                        <TextField
                            name="password"
                            label="Password"
                            type="password"
                            fullWidth
                            margin="dense"
                            value={form.password}
                            onChange={handleChange}
                        />
                        <TextField
                            name="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            fullWidth
                            margin="dense"
                            value={form.confirmPassword}
                            onChange={handleChange}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            sx={{ mt: 2 }}
                        >
                            Sign Up
                        </Button>
                    </Box>

                    {/* Login Link - Provides navigation for existing users */}
                    <Typography align="center" sx={{ mt: 2 }}>
                        Already have an account? <Link to="/login">Login here</Link>
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
};

export default SignUpPage;