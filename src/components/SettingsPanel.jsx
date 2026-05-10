import { useEffect, useState } from "react";
import { subscribeToSettings, updateSettings } from "../services/settingsService";
import { subscribeToUser, updateUser } from "../services/userService";

export default function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubSettings = subscribeToSettings(setSettings);
    const unsubUser = subscribeToUser(setUser);

    return () => {
      unsubSettings();
      unsubUser();
    };
  }, []);

  if (!settings || !user) {
    return null;
  }

  const save = async () => {
    await updateSettings({
      reminderHour: settings.reminderHour,
      reminderMinute: settings.reminderMinute,
      defaultSnoozeHours: settings.defaultSnoozeHours
    });

    await updateUser({
      name: user.name,
      notificationsEnabled: user.notificationsEnabled
    });

    setOpen(false);
  };

  return (
    <>
      <button className="settings-button" onClick={() => setOpen(true)}>
        ⚙️ Settings
      </button>

      {open && (
        <div className="modal">

          <h2>Settings</h2>

          <label>Name</label>
          <input
            value={user.name}
            onChange={(e) =>
              setUser({
                ...user,
                name: e.target.value
              })
            }
          />

          <label>Reminder Time</label>
          <input
            type="time"
            value={`${String(settings.reminderHour).padStart(2, "0")}:${String(settings.reminderMinute).padStart(2, "0")}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":");

              setSettings({
                ...settings,
                reminderHour: Number(h),
                reminderMinute: Number(m)
              });
            }}
          />

          <label>
            Notifications
          </label>
          <input
            type="checkbox"
            checked={user.notificationsEnabled}
            onChange={(e) =>
              setUser({
                ...user,
                notificationsEnabled: e.target.checked
              })
            }
          />

          <label>Default Snooze Hours</label>
          <input
            type="number"
            value={settings.defaultSnoozeHours}
            onChange={(e) =>
              setSettings({
                ...settings,
                defaultSnoozeHours: Number(e.target.value)
              })
            }
          />

          <button onClick={save}>
            Save
          </button>

        </div>
      )}
    </>
  );
}