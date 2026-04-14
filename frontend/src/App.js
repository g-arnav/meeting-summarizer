import { useState, useEffect } from "react";
import "./App.css";

// const API_URL = "https://meeting-summarizer-jwxx.onrender.com";
const API_URL = "http://localhost:5001";
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID?.trim();
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY?.trim();

export default function App() {
  const [text, setText] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Google Drive state
  const [googleToken, setGoogleToken] = useState(null);
  const [googleFile, setGoogleFile] = useState(null);
  const [pickerReady, setPickerReady] = useState(false);

  const googleDriveAvailable = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);

  useEffect(() => {
    if (!googleDriveAvailable) return;
    const interval = setInterval(() => {
      if (window.gapi) {
        window.gapi.load("picker", () => setPickerReady(true));
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [googleDriveAvailable]);

  const connectGoogleDrive = () => {
    if (!window.google?.accounts?.oauth2) {
      setError("Google Sign-In not loaded. Please refresh the page.");
      return;
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (response) => {
        if (response.error) {
          setError("Google Drive authentication failed. Please try again.");
          return;
        }
        setGoogleToken(response.access_token);
        setError("");
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  };

  const openPicker = () => {
    if (!pickerReady || !googleToken) return;

    const view = new window.google.picker.DocsView().setMimeTypes(
      [
        "application/vnd.google-apps.document",
        "application/pdf",
        "text/plain",
      ].join(",")
    );

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(googleToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const file = data.docs[0];
          setGoogleFile({ id: file.id, name: file.name, mimeType: file.mimeType });
          setText("");
          setError("");
        }
      })
      .build();

    picker.setVisible(true);
  };

  const handleSubmit = async () => {
    if (!googleFile && !text.trim()) return;
    setLoading(true);
    setSummary("");
    setError("");

    try {
      let res;

      if (googleFile) {
        res = await fetch(`${API_URL}/summarize-gdrive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: googleFile.id,
            access_token: googleToken,
            mime_type: googleFile.mimeType,
            provider,
          }),
        });
      } else {
        res = await fetch(`${API_URL}/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, provider }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setGoogleToken(null);
          setGoogleFile(null);
        }
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
          <p className="subtitle">
            Paste your meeting notes or import from Google Drive
          </p>
        </div>

        <textarea
          className={`textarea${googleFile ? " textarea-disabled" : ""}`}
          placeholder="Paste your meeting notes here..."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) setGoogleFile(null);
          }}
          rows={10}
          disabled={Boolean(googleFile)}
        />

        {googleDriveAvailable && (
          <>
            <div className="divider">
              <span>or import from</span>
            </div>
            <div className="gdrive-section">
              {!googleToken ? (
                <button className="gdrive-button" onClick={connectGoogleDrive}>
                  <DriveIcon />
                  Connect Google Drive
                </button>
              ) : !googleFile ? (
                <div className="gdrive-connected">
                  <button
                    className="gdrive-button"
                    onClick={openPicker}
                    disabled={!pickerReady}
                  >
                    <DriveIcon />
                    {pickerReady ? "Pick a File" : "Loading..."}
                  </button>
                  <button
                    className="gdrive-disconnect"
                    onClick={() => { setGoogleToken(null); setGoogleFile(null); }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="gdrive-file">
                  <DriveIcon />
                  <span className="gdrive-file-name">{googleFile.name}</span>
                  <button
                    className="gdrive-clear"
                    onClick={() => setGoogleFile(null)}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </>
        )}

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
            disabled={loading || (!text.trim() && !googleFile)}
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

function DriveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 87.3 78"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
        fill="#0066da"
      />
      <path
        d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
        fill="#00ac47"
      />
      <path
        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
        fill="#ea4335"
      />
      <path
        d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
        fill="#00832d"
      />
      <path
        d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
        fill="#2684fc"
      />
      <path
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
        fill="#ffba00"
      />
    </svg>
  );
}
