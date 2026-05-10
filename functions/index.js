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
    const statusRef = db.collection("dog").doc("status");
    const settingsRef = db.collection("dog").doc("settings");

    const [statusSnap, settingsSnap] = await Promise.all([
      statusRef.get(),
      settingsRef.get()
    ]);

    if (!statusSnap.exists || !settingsSnap.exists) {
      console.log("Missing status or settings");
      return;
    }

    const status = statusSnap.data();
    const settings = settingsSnap.data();

    const now = new Date();
    const nowMs = Date.now();

    // -----------------------------
    // 1. Snooze check
    // -----------------------------
    if (status.snoozedUntil && nowMs < status.snoozedUntil) {
      console.log("Snoozed");
      return;
    }

    // -----------------------------
    // 2. Daily reminder time check
    // -----------------------------
    const reminderHour = settings.reminderHour ?? 18;
    const reminderMinute = settings.reminderMinute ?? 0;

    const reminderTime = new Date();
    reminderTime.setHours(reminderHour, reminderMinute, 0, 0);

    const isAfterReminderTime = now >= reminderTime;

    // -----------------------------
    // 3. Feed cooldown (4 hours safety)
    // -----------------------------
    const fourHours = 4 * 60 * 60 * 1000;

    const lastFedAt = status.lastFedAt
      ? new Date(status.lastFedAt)
      : null;

    const notRecentlyFed =
      !lastFedAt ||
      nowMs - lastFedAt.getTime() > fourHours;

    // -----------------------------
    // 4. Prevent duplicate daily reminder
    // -----------------------------
    const alreadyRemindedToday = !!status.reminderSent;

    // -----------------------------
    // 5. FINAL DECISION
    // -----------------------------
    const shouldNotify =
      isAfterReminderTime &&
      notRecentlyFed &&
      !alreadyRemindedToday;

    if (!shouldNotify) {
      console.log("No reminder needed");
      return;
    }

    // -----------------------------
    // 6. Send notification
    // -----------------------------
    await sendPush(
      status.tokens || [],
      "🐶 Time to feed the dog!"
    );

    // -----------------------------
    // 7. Mark reminder as sent for today
    // -----------------------------
    await statusRef.update({
      reminderSent: true
    });

    console.log("Reminder sent");
  }
);

// -----------------------------
// Push helper
// -----------------------------
async function sendPush(tokens, message) {
  if (!tokens || tokens.length === 0) {
    console.log("No tokens");
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