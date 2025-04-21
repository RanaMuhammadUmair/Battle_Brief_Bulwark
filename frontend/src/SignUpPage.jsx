import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './styles.css';

const SignUpPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [countdown, setCountdown] = useState(10);

    const validateEmail = (email) => {
        // Basic regex check for email format
        const re = /\S+@\S+\.\S+/;
        return re.test(email);
    };

    // Start countdown when successMessage is set
    useEffect(() => {
        let timer;
        if (successMessage) {
            timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev === 1) {
                        clearInterval(timer);
                        navigate("/login");
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [successMessage, navigate]);

    const handleSignUp = async (e) => {
        e.preventDefault();

        // Validate each required field
        if (!username) {
            setError("Username is required");
            return;
        }
        if (!email) {
            setError("Email is required");
            return;
        }
        if (!validateEmail(email)) {
            setError("Enter a valid email address");
            return;
        }
        if (!password) {
            setError("Password is required");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Clear any previous errors
        setError("");

        try {
            const response = await fetch("http://localhost:8000/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

            // On successful signup, show the success message with countdown
            setSuccessMessage("Account created successfully. Redirecting to login page in ");
            // Optionally, clear the form fields
            setUsername("");
            setFullName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setCountdown(5);
        } catch (err) {
            console.error(err);
            setError("Signup failed");
        }
    };

    return (
        <div className="container">
            <h2>Sign Up</h2>
            {error && <p className="error">{error}</p>}
            {successMessage && (
                <p className="success">
                    {successMessage}{countdown} seconds.{' '}
                    <Link to="/login"></Link>
                </p>
            )}
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
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
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