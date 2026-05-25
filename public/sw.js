self.__WB_MANIFEST;

self.addEventListener("install", () => {
  console.log("✅ SW installed");
});

self.addEventListener("activate", () => {
  console.log("✅ SW activated");
});

/**
 * PUSH HANDLER
 */
self.addEventListener("push", (event) => {
  console.log("📬 PUSH RECEIVED");

  let payload = {};

  try {
    payload = event.data.json();
  } catch (err) {
    console.error("❌ Failed to parse push payload:", err);
    payload = {};
  }

  const title =
    payload.notification?.title || "🐶 Dog Reminder";

  const options = {
    body: payload.notification?.body || "Feed the dog!",
    icon: "/dog-feeder/icon-192.png",
    badge: "/dog-feeder/notification-badge.png",
    tag: "dog-feeder-notification",
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .catch((err) => {
        console.error("❌ Failed to show push notification:", err);
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = "/dog-feeder/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});