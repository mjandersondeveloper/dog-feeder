const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

const db = admin.firestore();

exports.reminderCheck = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1"
  },
  async () => {
    const docRef = db.collection("dog").doc("status");
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      console.log("Dog status document missing");
      return;
    }

    const data = snapshot.data();
    const now = Date.now();

    // Snoozed?
    if (data.snoozedUntil && now < data.snoozedUntil) {
      console.log("Notifications snoozed");
      return;
    }

    const fourHours = 4 * 60 * 60 * 1000;

    const shouldNotify =
      !data.lastFedAt ||
      now - data.lastFedAt > fourHours;

    if (shouldNotify && !data.reminderSent) {
      await sendPush(
        data.tokens || [],
        "Feed the dog! 🐶"
      );

      await docRef.update({
        reminderSent: true
      });

      console.log("Reminder sent");
    }
  }
);

async function sendPush(tokens, message) {
  if (!tokens.length) {
    console.log("No tokens found");
    return;
  }

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: "Dog Reminder",
      body: message
    }
  });
}