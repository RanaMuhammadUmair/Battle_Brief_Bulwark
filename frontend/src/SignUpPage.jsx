import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Box, Container, Paper, Stack, Avatar, Typography,
    TextField, Button, Alert
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';

const SignUpPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        username: "", fullName: "", email: "", password: "", confirmPassword: ""
    });
    const [error, setError] = useState("");

    const handleChange = e =>
        setForm({ ...form, [e.target.name]: e.target.value });

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
            <Container maxWidth="xs">
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 1 }}>
                    <Stack alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                            <PersonAddOutlinedIcon />
                        </Avatar>
                        <Typography variant="h5" sx={{ letterSpacing: 1 }}>
                            Sign Up
                        </Typography>
                    </Stack>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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

                    <Typography align="center" sx={{ mt: 2 }}>
                        Already have an account? <Link to="/login">Login here</Link>
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
};

export default SignUpPage;