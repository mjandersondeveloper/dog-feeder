import "./styles/app.css";
import { useCallback, useEffect, useState } from "react";
import {
  subscribeToStatus,
  markFed,
  getFeedHistory,
  initializeReminderSchedule,
  setSnooze
} from "./services/dogService";
import { subscribeToSettings } from "./services/settingsService";
import { subscribeToUser, updateUser } from "./services/userService";
import SettingsPanel from "./components/SettingsPanel";
import {
  listenForMessages,
  refreshNotificationToken
} from "./services/firebase";

const feedDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export default function App() {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [notificationError, setNotificationError] = useState("");

  const loadHistory = useCallback(async () => {
    setHistory(await getFeedHistory());
  }, []);

  useEffect(() => {
    const unsubStatus = subscribeToStatus(setStatus);
    const unsubSettings = subscribeToSettings(setSettings);
    const unsubUser = subscribeToUser(setUser);

    getFeedHistory()
      .then((feedHistory) => setHistory(feedHistory))
      .catch((error) => {
        console.error("Failed to load feed history:", error);
        setNotificationError("Feed history could not be loaded.");
      });

    return () => {
      unsubStatus();
      unsubSettings();
      unsubUser();
    };
  }, [loadHistory]);

  useEffect(() => {
    if (!status || status.reminderScheduleBootstrapAt) {
      return;
    }

    initializeReminderSchedule(status).catch((error) => {
      console.error("Failed to initialize the reminder schedule:", error);
      setNotificationError(
        "Reminder scheduling could not be initialized. Check the app connection and reload."
      );
    });
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    if (
      !user?.notificationsEnabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return undefined;
    }

    refreshNotificationToken()
      .then(async (token) => {
        if (!cancelled && token && token !== user.token) {
          await updateUser({ token });
        }
      })
      .catch((error) => {
        console.error("Failed to refresh the FCM token:", error);
        if (!cancelled) {
          setNotificationError(
            "Push notifications could not be registered on this device. Check notification and browser settings."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.notificationsEnabled, user?.token]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe;

    listenForMessages((payload) => {
      alert(
        `${payload.notification?.title || "Dog Feeder"}\n${
          payload.notification?.body || ""
        }`
      );
    })
      .then((stopListening) => {
        if (cancelled) {
          stopListening();
        } else {
          unsubscribe = stopListening;
        }
      })
      .catch((error) => {
        console.error("Failed to initialize foreground notifications:", error);
        if (!cancelled) {
          setNotificationError(
            "Foreground notifications are unavailable in this browser."
          );
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

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

  const currentDate = new Date();
  const alreadyFedToday =
    status.lastFedAt &&
    feedDateFormatter.format(new Date(status.lastFedAt)) ===
      feedDateFormatter.format(currentDate);

  return (
    <div className="app">
      <SettingsPanel />
      {notificationError && (
        <p role="alert">{notificationError}</p>
      )}
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
            currentDate.getTime() < status.snoozedUntil && (
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