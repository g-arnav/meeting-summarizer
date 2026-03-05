import { useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:5000";

export default function App() {
  const [text, setText] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setSummary("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setSummary(data.summary);
      }
    } catch (err) {
      setError("Could not reach the server. Is Flask running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">

        <div className="header">
          <h1 className="title">Meeting Summarizer</h1>
          <p className="subtitle">Paste your meeting notes and get an instant AI summary</p>
        </div>

        <textarea
          className="textarea"
          placeholder="Paste your meeting notes here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
        />

        <div className="controls">
          <select
            className="select"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="anthropic">Claude (Anthropic)</option>
            <option value="openai">GPT-4o mini (OpenAI)</option>
          </select>

          <button
            className="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Summarizing..." : "Summarize"}
          </button>
        </div>

        {error && <div className="error">⚠️ {error}</div>}

        {summary && (
          <div className="output">
            <h2 className="output-title">Summary</h2>
            <pre className="summary-text">{summary}</pre>
          </div>
        )}

      </div>
    </div>
  );
}