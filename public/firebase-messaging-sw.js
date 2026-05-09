importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBXO76RlgSt8sxZz9YX3j8S5ku28edEFYY",
  authDomain: "dog-feeder-43696.firebaseapp.com",
  projectId: "dog-feeder-43696",
  messagingSenderId: "239152156232",
  appId: "1:239152156232:web:dc87e3e19911474db8927d",
  storageBucket: "dog-feeder-43696.firebasestorage.app",
  measurementId: "G-04BY0NDQ7Z"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body
  });
});