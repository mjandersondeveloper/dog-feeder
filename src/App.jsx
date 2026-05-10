import { useEffect, useState } from "react";

import {
  subscribeToStatus,
  markFed,
  getFeedHistory
} from "./services/dogService";
import {
  subscribeToSettings
} from "./services/settingsService";
import SettingsPanel from "./components/SettingsPanel";
import "./styles/app.css";

export default function App() {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);

  const [debugMode, setDebugMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  // -----------------------------
  // Load Firestore streams
  // -----------------------------
  useEffect(() => {
    const unsubStatus = subscribeToStatus(setStatus);
    const unsubSettings = subscribeToSettings(setSettings);

    loadHistory();

    return () => {
      unsubStatus();
      unsubSettings();
    };
  }, []);

  const loadHistory = async () => {
    const data = await getFeedHistory();
    setHistory(data);
  };

  // -----------------------------
  // Feed dog action
  // -----------------------------
  const handleFed = async () => {
    if (!settings) return;

    await markFed(settings.defaultName);

    await loadHistory();
  };

  // -----------------------------
  // Debug mode unlock (hidden feature)
  // -----------------------------
  const handleDogTap = () => {
    const next = tapCount + 1;

    if (next >= 5) {
      setDebugMode(true);
      alert("🐶 Debug mode enabled");
    }

    setTapCount(next);
  };

  // -----------------------------
  // Loading state
  // -----------------------------
  if (!status || !settings) {
    return <div className="loading">Loading...</div>;
  }

  // -----------------------------
  // Daily feed check
  // -----------------------------
  const alreadyFedToday =
    status.lastFedAt &&
    new Date(status.lastFedAt).toDateString() ===
      new Date().toDateString();

  return (
    <div className="app">
      {/* Settings */}
      <SettingsPanel />
      {/* Main card */}
      <div className="card">
        <h1 onClick={handleDogTap}>
          🐶 Dog Feeder
        </h1>
        <div className="status">
          <p>
            <strong>Last Fed:</strong>
            <br />
            {status.lastFedAt
              ? new Date(status.lastFedAt).toLocaleString()
              : "Not yet"}
          </p>
          <p>
            <strong>Fed By:</strong>
            <br />
            {status.fedBy || "Nobody yet"}
          </p>
        </div>

        <button
          className={`feed-button ${
            alreadyFedToday && !debugMode
              ? "disabled"
              : ""
          }`}
          disabled={alreadyFedToday && !debugMode}
          onClick={handleFed}
        >
          {alreadyFedToday && !debugMode
            ? "✅ Fed Today"
            : "🍖 I Fed The Dog"}
        </button>

        {debugMode && (
          <div className="debug-banner">
            DEBUG MODE ENABLED
          </div>
        )}
      </div>
      {/* Feed history */}
      <div className="card history-card">
        <h2>📜 Feed History</h2>
        <table>
          <thead>
            <tr>
              <th>Fed By</th>
              <th>Time</th>
            </tr>
          </thead>

          <tbody>
            {history.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.fedBy}</td>
                <td>
                  {new Date(entry.fedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}