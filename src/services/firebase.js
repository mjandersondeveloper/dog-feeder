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

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    const token = await getToken(messaging, {
      vapidKey: "BNf2DZy04ygatabEREkc-ta6tPf4zT1xrXQlwsU-_aQZbdng5Cm0E0xOH-1SM0PjbyOn5iZixpNNsPmYvwjuzRI"
    });
    return token;
  }
};