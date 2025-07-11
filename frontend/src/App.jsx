import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import BattleBriefBulwark from "./BattleBriefBulwark.jsx";
import LoginPage from "./LoginPage.jsx";
import SignUpPage from "./SignUpPage.jsx";
import SettingPage from "./SettingPage.jsx";

// PrivateRoute component:
// - Checks for an auth token in localStorage.
// - If present, renders its children (protected content).
// - Otherwise, redirects to the login page.
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

// App component:
// - Root of the application.
// - Manages basic user info (username, fullName) stored in localStorage.
// - Sets up public and protected routes using react-router.
function App() {
  // Initialize user state from localStorage so it persists across reloads.
  const [user, setUser] = useState({
    username: localStorage.getItem("username") || "",
    fullName:  localStorage.getItem("fullName") || ""
  });

  // Sync user state with localStorage when the App mounts.
  useEffect(() => {
    setUser({
      username: localStorage.getItem("username") || "",
      fullName:  localStorage.getItem("fullName") || ""
    });
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Protected routes wrapped in PrivateRoute */}
        <Route
          path="/battle-brief-bulwark"
          element={
            <PrivateRoute>
              <BattleBriefBulwark user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingPage user={user} />
            </PrivateRoute>
          }
        />

        {/* Catch-all: redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
