import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Box, Container, Paper, Stack, Avatar, Typography,
    TextField, Button, Alert
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const LoginPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async e => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:8000/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username, password })
            });
            if (!res.ok) {
                setError("Invalid credentials");
                return;
            }
            const data = await res.json();
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("username", username);
            localStorage.setItem("fullName", data.full_name || "");
            navigate("/upload");
        } catch {
            setError("Login failed");
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
                            <LockOutlinedIcon />
                        </Avatar>
                        <Typography variant="h5" sx={{ letterSpacing: 1 }}>
                            Login
                        </Typography>
                    </Stack>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleLogin} noValidate>
                        <TextField
                            label="Username"
                            fullWidth
                            margin="dense"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                        <TextField
                            label="Password"
                            type="password"
                            fullWidth
                            margin="dense"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            sx={{ mt: 2 }}
                        >
                            Login
                        </Button>
                    </Box>

                    <Typography align="center" sx={{ mt: 2 }}>
                        Don’t have an account? <Link to="/signup">Sign Up here</Link>
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
};

export default LoginPage;