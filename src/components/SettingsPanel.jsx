import { useEffect, useState } from "react";
import { subscribeToSettings, updateSettings } from "../services/settingsService";
import { subscribeToUser, updateUser } from "../services/userService";
import { requestNotificationPermission } from "../services/firebase";

export default function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

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

  const enableNotifications = async () => {
    setNotificationMessage("");

    try {
      const token = await requestNotificationPermission();
      await updateUser({ token, notificationsEnabled: true });
      setNotificationMessage("Notifications are enabled on this device.");
    } catch (error) {
      console.error("Failed to enable notifications:", error);
      setNotificationMessage(error.message);
    }
  };

  const needsNotificationRegistration =
    user.notificationsEnabled &&
    (
      !user.token ||
      (
        typeof Notification !== "undefined" &&
        Notification.permission !== "granted"
      )
    );

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
          {needsNotificationRegistration && (
            <button type="button" onClick={enableNotifications}>
              Enable Notifications on This Device
            </button>
          )}
          {notificationMessage && (
            <p role="status">{notificationMessage}</p>
          )}

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