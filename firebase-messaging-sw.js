importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBXO76RlgSt8sxZz9YX3j8S5ku28edEFYY",
  authDomain: "dog-feeder-43696.firebaseapp.com",
  projectId: "dog-feeder-43696",
  messagingSenderId: "239152156232",
  appId: "1:239152156232:web:dc87e3e19911474db8927d"
});

const messaging = firebase.messaging();

/**
 * Background notifications
 */
messaging.onBackgroundMessage((payload) => {
  console.log("📬 Background message:", payload);

  self.registration.showNotification(
    payload.notification?.title || "Dog Feeder",
    {
      body: payload.notification?.body || "",
      icon: "/dog-feeder/icon.png"
    }
  );
});