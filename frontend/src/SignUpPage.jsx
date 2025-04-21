import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './styles.css'; // Assuming you have a shared CSS file for styling like UploadPage

const SignUpPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSignUp = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("http://localhost:8000/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    full_name: fullName,
                    email,
                    password,
                }),
            });
            if (!response.ok) {
                const errData = await response.json();
                setError(errData.detail || "Signup failed");
                return;
            }
            // On successful signup, redirect to login
            navigate("/login");
        } catch (err) {
            console.error(err);
            setError("Signup failed");
        }
    };

    return (
        <div className="container">
            <h2>Sign Up</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSignUp}>
                <div className="form-group">
                    <input 
                        type="text" 
                        placeholder="Username" 
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required 
                        className="bg-white text-gray-700"
                    />
                </div>
                <div className="form-group">
                    <input 
                        type="text" 
                        placeholder="Full Name" 
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="bg-white text-gray-700"
                    />
                </div>
                <div className="form-group">
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required 
                        className="bg-white text-gray-700"
                    />
                </div>
                <div className="form-group">
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required 
                        className="bg-white text-gray-700"
                    />
                </div>
                <button type="submit" className="btn">Sign Up</button>
            </form>
            <p>
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </div>
    );
};

export default SignUpPage;