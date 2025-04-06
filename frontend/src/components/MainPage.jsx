import React, { useState } from "react";
import axios from "axios";
import { FaFileUpload, FaSpinner } from "react-icons/fa";

const MainPage = ({ user }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [model, setModel] = useState("gpt4");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      setError("Please select a file to summarize.");
      return;
    }
    
    setLoading(true);
    setError("");
    setSummary("");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", model);
      formData.append("user_id", user.id);
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const res = await axios.post(`${backendUrl}/summarize`, formData);
      
      setSummary(res.data.summary);
    } catch (err) {
      console.error("Summarization failed:", err);
      setError("An error occurred during summarization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Military Report Summarizer</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Upload Document
          </label>
          <div className="flex items-center">
            <label className="w-64 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
              <FaFileUpload className="mr-2" />
              <span>Select File</span>
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
              />
            </label>
            <span className="ml-3 text-gray-600 truncate max-w-xs">{fileName}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, DOC, DOCX, TXT</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Select Model
          </label>
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="gpt4">GPT-4</option>
            <option value="claude">Claude</option>
            <option value="bart">BART</option>
            <option value="t5">T5-Small</option>
          </select>
        </div>
        
        <button 
          onClick={handleSummarize} 
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center w-full"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin mr-2" />
              Processing...
            </>
          ) : (
            "Summarize Document"
          )}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {summary && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">Summary</h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <p className="whitespace-pre-line">{summary}</p>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => {navigator.clipboard.writeText(summary)}}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded mr-2"
            >
              Copy to Clipboard
            </button>
            
            <button 
              onClick={() => {window.print()}}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Print Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
