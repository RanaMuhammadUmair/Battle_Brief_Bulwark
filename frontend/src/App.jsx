import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UploadPage from "./UploadPage";
import SummariesPage from "./SummariesPage";
import Layout from "./components/Layout";

const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/summaries" element={<SummariesPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
