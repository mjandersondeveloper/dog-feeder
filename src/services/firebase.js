import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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
 * Request permission + get FCM token
 */
export const requestNotificationPermission = async () => {
  try {
    if (!("Notification" in window)) {
      console.warn("⚠️ Notifications not supported in this browser");
      return null;
    }

    console.log("🔔 Requesting notification permission...");
    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      console.warn("⚠️ Notification permission denied:", permission);
      return null;
    }

    console.log("✅ Notification permission granted");

    const messaging = getMessaging(app);
    const swRegistration = await navigator.serviceWorker.ready;

    if (!swRegistration.active) {
      console.error("❌ Service Worker is not active");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: "BNf2DZy04ygatabEREkc-ta6tPf4zT1xrXQlwsU-_aQZbdng5Cm0E0xOH-1SM0PjbyOn5iZixpNNsPmYvwjuzRI",
      serviceWorkerRegistration: swRegistration
    });

    console.log("🔥 FCM Token generated successfully");

    return token;
  } catch (err) {
    console.error("❌ FCM Token error:", err.message, err);
    return null;
  }
};

/**
 * Foreground message handler
 */
export const listenForMessages = () => {
  const messaging = getMessaging(app);

  onMessage(messaging, (payload) => {
    console.log("📩 Foreground message:", payload);

    alert(
      payload.notification?.title +
        "\n" +
        payload.notification?.body
    );
  });
};