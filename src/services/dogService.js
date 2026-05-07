import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const ref = doc(db, "dog", "status");

export const getStatus = async () => {
  const snap = await getDoc(ref);
  return snap.data();
};

export const markFed = async (user) => {
  await updateDoc(ref, {
    lastFedAt: Date.now(),
    fedBy: user,
    reminderSent: false
  });
};

export const setSnooze = async (timestamp) => {
  await updateDoc(ref, {
    snoozedUntil: timestamp
  });
};

export const saveToken = async (token) => {
  const snap = await getDoc(ref);
  const data = snap.data();
  const tokens = data.tokens || [];

  if (!tokens.includes(token)) {
    await updateDoc(ref, {
      tokens: [...tokens, token]
    });
  }
};