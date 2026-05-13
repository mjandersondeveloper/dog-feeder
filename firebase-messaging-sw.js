importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBXO76RlgSt8sxZz9YX3j8S5ku28edEFYY",
  authDomain: "dog-feeder-43696.firebaseapp.com",
  projectId: "dog-feeder-43696",
  messagingSenderId: "239152156232",
  appId: "1:239152156232:web:dc87e3e19911474db8927d"
});

firebase.messaging();

/**
 * RAW PUSH EVENT HANDLER
 * More reliable for PWAs than onBackgroundMessage()
 */
self.addEventListener("push", (event) => {
  console.log("📬 RAW PUSH:", event);

  if (!event.data) {
    return;
  }

  const payload = event.data.json();

  console.log("📦 PUSH PAYLOAD:", payload);

  const title =
    payload.notification?.title || "🐶 Dog Reminder";

  const options = {
    body:
      payload.notification?.body || "Feed the dog!",
    icon: "/dog-feeder/icon.png",
    badge: "/dog-feeder/icon.png",
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "TEST_NOTIFICATION") {
    self.registration.showNotification("🐶 SW Test", {
      body: "Service worker notifications work!",
      icon: "/dog-feeder/icon.png"
    });
  }
});