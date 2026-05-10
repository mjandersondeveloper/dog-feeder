import { useEffect, useState } from "react";
import {
  subscribeToSettings,
  updateSettings
} from "../services/settingsService";

export default function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToSettings(setSettings);
    return () => unsub();
  }, []);

  if (!settings) return null;

  const handleChange = (field, value) => {
    setSettings({
      ...settings,
      [field]: value
    });
  };

  const save = async () => {
    await updateSettings(settings);
    setOpen(false);
  };

  return (
    <>
      <button
        className="settings-button"
        onClick={() => setOpen(true)}
      >
        ⚙️ Settings
      </button>

      {open && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Settings ⚙️</h2>

            <label>Name</label>
            <input
              value={settings.defaultName}
              onChange={(e) =>
                handleChange(
                  "defaultName",
                  e.target.value
                )
              }
            />

            <label>Daily Reminder Time</label>
            <input
                type="time"
                value={`${String(settings.reminderHour).padStart(2, "0")}:${String(
                    settings.reminderMinute
                ).padStart(2, "0")}`}
                onChange={(e) => {
                    const [hour, minute] = e.target.value.split(":");

                    handleChange("reminderHour", Number(hour));
                    handleChange("reminderMinute", Number(minute));
                }}
            />

            <label>Snooze Until</label>
            <input
            type="datetime-local"
            value={
                settings.snoozedUntil
                ? new Date(settings.snoozedUntil)
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) => {
                handleChange(
                "snoozedUntil",
                new Date(e.target.value).getTime()
                );
            }}
            />

            <div className="modal-actions">
              <button onClick={() => setOpen(false)}>
                Cancel
              </button>

              <button onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}