import "./styles/app.css";
import { useEffect, useState } from "react";

import {
  subscribeToStatus,
  markFed,
  getFeedHistory,
  setSnooze
} from "./services/dogService";

import {
  subscribeToSettings
} from "./services/settingsService";

import {
  subscribeToUser,
  updateUser
} from "./services/userService";

import SettingsPanel from "./components/SettingsPanel";

import {
  registerServiceWorker,
  requestNotificationPermission,
  listenForMessages
} from "./services/firebase";

export default function App() {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const unsubStatus = subscribeToStatus(setStatus);
    const unsubSettings = subscribeToSettings(setSettings);
    const unsubUser = subscribeToUser(setUser);

    loadHistory();

    return () => {
      unsubStatus();
      unsubSettings();
      unsubUser();
    };
  }, []);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const initFCM = async () => {
      if (!user) return;

      const token = await requestNotificationPermission();

      if (token) {
        await updateUser({ token });
      }

      listenForMessages();
    };

    initFCM();
  }, [user]);

  const loadHistory = async () => {
    setHistory(await getFeedHistory());
  };

  const handleFed = async () => {
    await markFed(user.name);
    await loadHistory();
  };

  const handleSnooze = async () => {
    const snoozeUntil =
      Date.now() + settings.defaultSnoozeHours * 60 * 60 * 1000;

    await setSnooze(snoozeUntil);
  };

  if (!status || !settings || !user) {
    return <div>Loading...</div>;
  }

  const alreadyFedToday =
    status.lastFedAt &&
    new Date(status.lastFedAt).toDateString() ===
      new Date().toDateString();

  return (
    <div className="app">

      <SettingsPanel />

      <div className="card">
        <h1>🐶 Dog Feeder</h1>

        <div className="status">
          <p>
            <strong>Last Fed:</strong><br />
            {status.lastFedAt
              ? new Date(status.lastFedAt).toLocaleString()
              : "Not yet"}
          </p>

          <p>
            <strong>Fed By:</strong><br />
            {status.fedBy || "Nobody yet"}
          </p>

          {status.snoozedUntil &&
            Date.now() < status.snoozedUntil && (
              <p>
                <strong>Snoozed Until:</strong><br />
                {new Date(status.snoozedUntil).toLocaleString()}
              </p>
          )}
        </div>

        <button
          className="feed-button"
          onClick={handleFed}
          disabled={alreadyFedToday}
        >
          {alreadyFedToday
            ? "✅ Already Fed"
            : "🍖 I Fed The Dog"}
        </button>

        <button
          className="secondary-button"
          onClick={handleSnooze}
        >
          😴 Snooze Reminders
        </button>
      </div>

      <div className="card">
        <h2>📜 Feed History</h2>

        <table>
          <thead>
            <tr>
              <th>Fed By</th>
              <th>Time</th>
            </tr>
          </thead>

          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.fedBy}</td>
                <td>{new Date(h.fedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}