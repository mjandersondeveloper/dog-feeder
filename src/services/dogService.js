import {
  doc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";

import { db } from "./firebase";

const statusRef = doc(db, "dog", "status");

export const subscribeToStatus = (cb) => {
  return onSnapshot(statusRef, (snap) => {
    cb(snap.data());
  });
};

export const markFed = async (userName) => {
  const now = Date.now();

  await updateDoc(statusRef, {
    lastFedAt: now,
    fedBy: userName,
    reminderSent: false
  });

  await addDoc(collection(db, "dogFeedHistory"), {
    fedBy: userName,
    fedAt: now
  });

  // Send notification to all devices
  try {
    await sendDogFedNotification();
  } catch (err) {
    console.error("Failed to send dog fed notification:", err);
  }
};

export const setSnooze = async (timestamp) => {
  await updateDoc(statusRef, {
    snoozedUntil: timestamp
  });
};

export const getFeedHistory = async () => {
  const q = query(
    collection(db, "dogFeedHistory"),
    orderBy("fedAt", "desc"),
    limit(10)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));
};

export const sendDogFedNotification = async () => {
  const url =
    "https://us-central1-dog-feeder-43696.cloudfunctions.net/sendDogFedNotification";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Notification failed: ${response.status} ${errorText}`
    );
  }

  return response.json();
};