import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBXO76RlgSt8sxZz9YX3j8S5ku28edEFYY",
  authDomain: "dog-feeder-43696.firebaseapp.com",
  projectId: "dog-feeder-43696",
  messagingSenderId: "239152156232",
  appId: "1:239152156232:web:dc87e3e19911474db8927d",
  storageBucket: "dog-feeder-43696.firebasestorage.app",
  measurementId: "G-04BY0NDQ7Z"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Request permission from an explicit user action and register this device.
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    throw new Error("This browser does not support notifications.");
  }

  if (!(await isSupported())) {
    throw new Error("Firebase messaging is not supported in this browser.");
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked in this browser's site settings."
        : "Notification permission was not granted."
    );
  }

  return getFcmToken();
};

/**
 * Refresh the FCM token when permission has already been granted.
 */
export const refreshNotificationToken = async () => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return null;
  }

  if (!(await isSupported())) {
    throw new Error("Firebase messaging is not supported in this browser.");
  }

  return getFcmToken();
};

const getFcmToken = async () => {
  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser does not support service workers.");
  }

  const swRegistration = await navigator.serviceWorker.ready;
  if (!swRegistration.active) {
    throw new Error("The notification service worker is not active.");
  }

  return getToken(getMessaging(app), {
    vapidKey: "BNf2DZy04ygatabEREkc-ta6tPf4zT1xrXQlwsU-_aQZbdng5Cm0E0xOH-1SM0PjbyOn5iZixpNNsPmYvwjuzRI",
    serviceWorkerRegistration: swRegistration
  });
};

/**
 * Foreground message handler
 */
export const listenForMessages = async (callback) => {
  if (!(await isSupported())) {
    throw new Error("Firebase messaging is not supported in this browser.");
  }

  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
};