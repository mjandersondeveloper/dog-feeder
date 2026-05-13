const admin =
  require("firebase-admin");

const {
  onSchedule
} = require(
  "firebase-functions/v2/scheduler"
);
const {
  onRequest
} = require(
  "firebase-functions/v2/https"
);

admin.initializeApp();

const db =
  admin.firestore();

exports.reminderCheck =
  onSchedule(
    {
      schedule:
        "every 15 minutes",

      region:
        "us-central1"
    },

    async () => {

      const statusRef =
        db.collection("dog")
          .doc("status");

      const settingsRef =
        db.collection("dog")
          .doc("settings");

      const usersRef =
        db.collection("users");

      const [
        statusSnap,
        settingsSnap,
        usersSnap
      ] = await Promise.all([
        statusRef.get(),
        settingsRef.get(),
        usersRef.get()
      ]);

      if (
        !statusSnap.exists ||
        !settingsSnap.exists
      ) {
        console.log(
          "Missing docs"
        );

        return;
      }

      const status =
        statusSnap.data();

      const settings =
        settingsSnap.data();

      const now =
        new Date();

      const nowMs =
        Date.now();

      // Snooze
      if (
        status.snoozedUntil &&
        nowMs <
          status.snoozedUntil
      ) {
        console.log(
          "Snoozed"
        );

        return;
      }

      // Reminder time
      const reminderHour =
        settings.reminderHour ??
        18;

      const reminderMinute =
        settings.reminderMinute ??
        0;

      const reminderTime =
        new Date();

      reminderTime.setHours(
        reminderHour,
        reminderMinute,
        0,
        0
      );

      const isAfterReminderTime =
        now >= reminderTime;

      // Feed cooldown
      const fourHours =
        4 *
        60 *
        60 *
        1000;

      const lastFedAt =
        status.lastFedAt
          ? new Date(
              status.lastFedAt
            )
          : null;

      const notRecentlyFed =
        !lastFedAt ||
        nowMs -
          lastFedAt.getTime() >
          fourHours;

      // Already reminded
      const alreadyRemindedToday =
        !!status.reminderSent;

      const shouldNotify =
        isAfterReminderTime &&
        notRecentlyFed &&
        !alreadyRemindedToday;

      if (!shouldNotify) {
        console.log(
          "No reminder needed"
        );

        return;
      }

      // Collect user tokens
      const tokens =
        usersSnap.docs
          .map((doc) =>
            doc.data()
          )
          .filter(
            (user) =>
              user.notificationsEnabled &&
              user.token
          )
          .map(
            (user) =>
              user.token
          );

      await sendPush(tokens, {
        title: "Woof! Feed Reminder!",
        body: "🐶 Time to feed the dog!"
      });

      await statusRef.update({
        reminderSent: true
      });

      console.log(
        "Reminder sent"
      );
    }
  );

async function sendPush(
  tokens,
  notification
) {

  if (
    !tokens ||
    tokens.length === 0
  ) {
    console.log(
      "No tokens"
    );

    return {
      successCount: 0,
      failureCount: 0
    };
  }

  return await admin.messaging()
    .sendEachForMulticast({
      tokens,
      notification
    });
}

exports.sendDogFedNotification = onRequest(
  {
    cors: true
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const usersSnap = await db.collection("users").get();

    const tokens = usersSnap.docs
      .map((doc) => doc.data())
      .filter(
        (user) =>
          user.notificationsEnabled &&
          user.token
      )
      .map((user) => user.token);

    const sendResult = await sendPush(tokens, {
      title: "Woof! Dog Fed!",
      body: "🐶 Thanks for the brown rocks!"
    });

    res.status(200).send({
      success: true,
      sent: sendResult.successCount,
      failed: sendResult.failureCount
    });
  }
);