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

export const subscribeToStatus = (callback) => {
  return onSnapshot(statusRef, (snapshot) => {
    callback(snapshot.data());
  });
};

export const markFed = async (user) => {
  const now = Date.now();

  await updateDoc(statusRef, {
    lastFedAt: now,
    fedBy: user,
    reminderSent: false
  });

  await addDoc(collection(db, "dogFeedHistory"), {
    fedBy: user,
    fedAt: now
  });
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

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
};