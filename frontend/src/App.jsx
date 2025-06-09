import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import UploadPage from "./UploadPage.jsx";
import LoginPage from "./LoginPage.jsx";
import SignUpPage from "./SignUpPage.jsx";
import SettingPage from "./SettingPage.jsx";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const [user, setUser] = useState({ username: "", fullName: "" });

  useEffect(() => {
    // whenever App mounts, pull user info out of localStorage
    setUser({
      username: localStorage.getItem("username") || "",
      fullName:  localStorage.getItem("fullName") || ""
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        <Route
          path="/upload"
          element={
            <PrivateRoute>
              {/* now UploadPage will receive user.username + user.fullName */}
              <UploadPage user={user} />
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
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
