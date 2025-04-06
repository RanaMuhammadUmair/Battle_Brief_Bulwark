import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { FaFileAlt, FaSpinner } from "react-icons/fa";

const HistoryPage = ({ user }) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSummary, setSelectedSummary] = useState(null);

  useEffect(() => {
    const fetchSummaryHistory = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        const response = await axios.get(`${backendUrl}/summaries/${user.id}`);
        setSummaries(response.data.summaries);
      } catch (err) {
        console.error("Failed to fetch summary history:", err);
        setError("Failed to load summary history. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryHistory();
  }, [user.id]);

  const handleSummaryClick = (summary) => {
    setSelectedSummary(summary === selectedSummary ? null : summary);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Summary History</h1>

      {summaries.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">No summary history available.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {summaries.map((summary) => (
              <div 
                key={summary.id} 
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSummaryClick(summary)}
              >
                <div className="flex items-start">
                  <FaFileAlt className="h-5 w-5 text-blue-500 mt-1 mr-3" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-gray-800">
                        {summary.metadata?.filename || "Document"}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {format(new Date(summary.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Model: {summary.metadata?.model || "Unknown"}
                    </p>
                    
                    {selectedSummary === summary && (
                      <div className="mt-4 bg-gray-50 p-3 rounded-md border border-gray-200">
                        <h4 className="font-medium mb-2">Summary:</h4>
                        <p className="text-gray-800 whitespace-pre-line">{summary.summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
