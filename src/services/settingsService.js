import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const settingsRef = doc(db, "dog", "settings");

export const subscribeToSettings = (cb) => {
  return onSnapshot(settingsRef, (snap) => {
    cb(snap.data());
  });
};

export const updateSettings = async (data) => {
  await setDoc(settingsRef, data, { merge: true });
};