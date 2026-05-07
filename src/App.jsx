import { useEffect, useState } from "react";
import { getStatus, markFed, setSnooze, saveToken } from "./services/dogService";
import { requestNotificationPermission } from "./services/firebase";

export default function App() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getStatus();
    setStatus(data);
  };

  const handleFed = async () => {
    await markFed("Mark");
    await load();
    alert("Dog fed!");
  };

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      await saveToken(token);
      alert("Notifications enabled");
    }
  };

  const handleSnooze = async () => {
    const hours = prompt("Snooze for how many hours?");
    const ts = Date.now() + hours * 60 * 60 * 1000;
    await setSnooze(ts);
    await load();
  };

  if (!status) return <div>Loading...</div>;

  const lastFed = status.lastFedAt
    ? new Date(status.lastFedAt).toLocaleString()
    : "Not yet";

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>🐶 Dog Feeder</h1>
      <p><strong>Last Fed:</strong> {lastFed}</p>
      <p><strong>By:</strong> {status.fedBy || "-"}</p>

      <button onClick={handleFed} style={{ fontSize: 20 }}>
        ✅ I Fed the Dog
      </button>

      <br /><br />

      <button onClick={handleEnableNotifications}>
        🔔 Enable Notifications
      </button>

      <br /><br />

      <button onClick={handleSnooze}>
        😴 Snooze
      </button>
    </div>
  );
}