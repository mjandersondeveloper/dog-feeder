import { useEffect, useState } from "react";
import {
  subscribeToStatus,
  markFed,
  getFeedHistory
} from "./services/dogService";
import "./styles/app.css";

export default function App() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [debugMode, setDebugMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [nameInput, setNameInput] = useState("");

  const userName =
    localStorage.getItem("name") || "Unknown Human";
  
  useEffect(() => {
    const unsubscribe = subscribeToStatus((data) => {
      setStatus(data);
    });

    loadHistory();

    return () => unsubscribe();
  }, []);

  const loadHistory = async () => {
    const data = await getFeedHistory();
    setHistory(data);
  };

  const handleFed = async () => {
    await markFed(userName);
    await loadHistory();
  };

  const handleDogTap = () => {
    const next = tapCount + 1;

    if (next >= 5) {
      setDebugMode(true);
      alert("🐶 Debug mode enabled");
    }

    setTapCount(next);
  };

  if (!localStorage.getItem("name")) {
    return (
      <div className="app">
        <div className="card">
          <h1>🐶 Welcome</h1>

          <p>Enter your name:</p>

          <input
            className="name-input"
            value={nameInput}
            onChange={(e) =>
              setNameInput(e.target.value)
            }
            placeholder="Your name"
          />

          <button
            className="feed-button"
            onClick={() => {
              if (!nameInput.trim()) {
                return;
              }

              localStorage.setItem(
                "name",
                nameInput
              );

              window.location.reload();
            }}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  if (!status) {
    return <div className="loading">Loading...</div>;
  }

  const alreadyFedToday =
    status.lastFedAt &&
    new Date(status.lastFedAt).toDateString() ===
      new Date().toDateString();

  return (
    <div className="app">
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
            {status.fedBy || "Nobody Yet"}
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
                  {new Date(
                    entry.fedAt
                  ).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}