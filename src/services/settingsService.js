import {
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "firebase/firestore";

import { db } from "./firebase";

const settingsRef = doc(db, "dog", "settings");

// get once
export const getSettings = async () => {
  const snap = await getDoc(settingsRef);

  if (!snap.exists()) {
    const defaultSettings = {
      defaultName: "Unknown Human",
      reminderHour: 18,
      reminderMinute: 0,
      defaultSnoozeHours: 24,
      notificationsEnabled: true
    };

    await setDoc(settingsRef, defaultSettings);
    return defaultSettings;
  }

  return snap.data();
};

// realtime sync
export const subscribeToSettings = (cb) => {
  return onSnapshot(settingsRef, (snap) => {
    cb(snap.data());
  });
};

export const updateSettings = async (newSettings) => {
  await setDoc(settingsRef, newSettings, { merge: true });
};