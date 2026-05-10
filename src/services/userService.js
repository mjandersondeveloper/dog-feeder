import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const DEVICE_ID_KEY = "dog-app-device-id";

export const getDeviceId = () => {
  let id = localStorage.getItem(DEVICE_ID_KEY);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }

  return id;
};

const userRef = () => doc(db, "users", getDeviceId());

export const subscribeToUser = (cb) => {
  return onSnapshot(userRef(), async (snap) => {
    if (!snap.exists()) {
      const defaultUser = {
        name: "Unknown Human",
        notificationsEnabled: true,
        token: ""
      };

      await setDoc(userRef(), defaultUser);
      cb(defaultUser);
      return;
    }

    cb(snap.data());
  });
};

export const updateUser = async (data) => {
  await setDoc(userRef(), data, { merge: true });
};