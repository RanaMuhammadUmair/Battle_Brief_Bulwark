import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Box, Container, Paper, Stack, Avatar, Typography,
    TextField, Button, Alert
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import bgVideo from './assets/videos/BATTLE-BRIEF_bg-1080p.mp4';

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
                position: 'relative',
                minHeight: '100vh',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                bgcolor: 'transparent',
                py: 4,
            }}
        >
            <video
                autoPlay
                loop
                muted
                playsInline
                src="/videos/BATTLE-BRIEF_bg-1080p.mp4"
                onLoadedData={() => console.log('✅ video loaded')}
                onError={e => console.error('❌ video error', e)}
                style={{
                    position: 'fixed',    // cover viewport regardless of parent
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                
                    objectFit: 'cover',
                    zIndex: 0,            // sit just above the body background
                }}
            />

            <Container
                maxWidth="xs"
                sx={{
                    position: 'relative',
                    zIndex: 1,            // raise form above the video
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        p: { xs: 2, sm: 4 },
                        borderRadius: 1,
                        bgcolor: 'rgba(255, 255, 255, 0.7)',   // ← translucent white
                        backdropFilter: 'blur(1px)'         // ← optional frosted-glass effect
                    }}
                >
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
                            changeColor="white"
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