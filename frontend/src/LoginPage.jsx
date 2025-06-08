import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("http://localhost:8000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    username,
                    password
                }),
            });
            if (!response.ok) {
                setError("Invalid credentials");
                return;
            }
            const data = await response.json();
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("username", username);
            localStorage.setItem("fullName", data.full_name || "");
            navigate("/upload");  // Redirect to UploadPage on success
        } catch (err) {
            console.error(err);
            setError("Login failed");
        }
    };

    return (
        <div className="container">
            <h2>Login</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleLogin}>
                <div className="form-group">
                    <input 
                        type="text" 
                        placeholder="Username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)}
                        required 
                        className="bg-white text-gray-700" // Set background to white and text color
                    />
                </div>
                <div className="form-group">
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        required 
                        className="bg-white text-gray-700" // Set background to white and text color
                    />
                </div>
                <button type="submit" className="btn">Login</button>
            </form>
            <p>
                Don't have an account? <Link to="/signup">Sign Up here</Link>
            </p>
        </div>
    );
};

export default LoginPage;