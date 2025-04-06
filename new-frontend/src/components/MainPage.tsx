"use client";
import React, { useState } from "react";
import { FaFileUpload, FaSpinner } from "react-icons/fa";

const MainPage = ({ user }: { user: any }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [model, setModel] = useState("gpt4");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files && e.target.files[0];
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

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/summarize`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err: any) {
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
            onChange={(e) => setModel((e.target.value))}
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
              onClick={() => { navigator.clipboard.writeText(summary) }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded mr-2"
            >
              Copy to Clipboard
            </button>

            <button
              onClick={() => { window.print() }}
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
````

#### /home/ranaumairb/Nato-llm-summerizer/new-frontend/src/components/HistoryPage.tsx

```typescript
// filepath: /home/ranaumairb/Nato-llm-summerizer/new-frontend/src/components/HistoryPage.tsx
"use client";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { FaFileAlt, FaSpinner } from "react-icons/fa";

interface Summary {
  id: number;
  metadata: { filename: string; model: string } | null;
  created_at: string;
  summary: string;
}

const HistoryPage = ({ user }: { user: any }) => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const fetchSummaryHistory = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${backendUrl}/summaries/${user.id}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setSummaries(data.summaries);
      } catch (err: any) {
        console.error("Failed to fetch summary history:", err);
        setError("Failed to load summary history. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryHistory();
  }, [user.id]);

  const handleSummaryClick = (summary: Summary) => {
    setSelectedSummary(selectedSummary === summary ? null : summary);
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
```

#### /home/ranaumairb/Nato-llm-summerizer/new-frontend/src/components/Navbar.tsx

```typescript
// filepath: /home/ranaumairb/Nato-llm-summerizer/new-frontend/src/components/Navbar.tsx
"use client";
import React from "react";
import { useRouter, usePathname } from 'next/navigation';
import { FaHome, FaHistory, FaSignOutAlt } from "react-icons/fa";

const Navbar = ({ user }: { user: any }) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="font-bold text-xl">NATO Intel</span>

            <div className="ml-10 flex items-center space-x-4">
              <a
                href="/"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${pathname === '/' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
              >
                <FaHome className="mr-2" />
                Home
              </a>

              <a
                href="/history"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${pathname === '/history' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
              >
                <FaHistory className="mr-2" />
                History
              </a>
            </div>
          </div>

          <div className="flex items-center">
            <span className="text-sm mr-4">
              Welcome, {user?.username || 'User'}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              <FaSignOutAlt className="mr-2" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
```

#### /home/ranaumairb/Nato-llm-summerizer/new-frontend/src/components/Login.tsx

```typescript
// filepath: /home/ranaumairb/Nato-llm-summerizer/new-frontend/src/components/Login.tsx
"use client";
import React, { useState } from "react";

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Hardcoded credentials for demonstration
  const validCredentials = {
    username: "admin",
    password: "nato2023",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (username === validCredentials.username &&
      password === validCredentials.password) {
      setError("");
      onLogin({
        id: "1",
        username: username,
        role: "admin",
      });
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">NATO Intelligence</h2>
          <p className="text-gray-600 mt-2">Military Report Summarizer</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
```

### 6. Update the README

Update the README to reflect the new Next.js setup.

```markdown
# NATO Military Intelligence Summarizer

...existing content...

## Development

### Frontend Setup (Next.js)

```bash
cd new-frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
```

### 7.  Set Environment Variables

Create a `.env.local` file in the `new-frontend` directory and add the backend URL:

