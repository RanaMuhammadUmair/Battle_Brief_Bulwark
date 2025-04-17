import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import UploadPage from './UploadPage.jsx';
import SummariesPage from './SummariesPage.jsx';
import LoginPage from './LoginPage.jsx';
import SignUpPage from './SignUpPage.jsx';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route 
          path="/upload" 
          element={
            <PrivateRoute>
              <UploadPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/summaries" 
          element={
            <PrivateRoute>
              <SummariesPage />
            </PrivateRoute>
          } 
        />
        {/* Default route. Redirect to login */}
        <Route 
          path="*" 
          element={<Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
