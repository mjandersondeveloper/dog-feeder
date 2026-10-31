const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { getFunctions } = require("firebase-admin/functions");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const {
  getNextReminderAt,
  getReminderInputSignature,
  toMillis
} = require("./reminderLogic");
const {
  createTaskId,
  enqueueReminderTask,
  reconcileReminderSchedule
} = require("./reminderScheduler");

admin.initializeApp();

const db = admin.firestore();
const REGION = "us-central1";
const REMINDER_TASK_QUEUE = getFunctions().taskQueue("reminderDispatch");
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered"
]);

async function sendPush(notification, kind) {
  const usersSnap = await db.collection("users").get();
  const tokenReferences = new Map();

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    if (
      user.notificationsEnabled !== true ||
      typeof user.token !== "string" ||
      !user.token.trim()
    ) {
      continue;
    }

    const token = user.token.trim();
    const references = tokenReferences.get(token) || [];
    references.push(userDoc.ref);
    tokenReferences.set(token, references);
  }

  const tokens = [...tokenReferences.keys()];
  if (tokens.length === 0) {
    console.info("No enabled notification tokens", { kind });
    return { successCount: 0, failureCount: 0 };
  }

  let successCount = 0;
  let failureCount = 0;

  for (let index = 0; index < tokens.length; index += 500) {
    const batch = tokens.slice(index, index + 500);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      notification,
      data: { kind },
      webpush: {
        headers: {
          TTL: "86400",
          Urgency: "high"
        },
        notification: {
          title: notification.title,
          body: notification.body,
          icon: "/dog-feeder/icon-192.png",
          badge: "/dog-feeder/notification-badge.png",
          tag: `dog-feeder-${kind}`,
          requireInteraction: true
        }
      }
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    const invalidTokens = [];
    response.responses.forEach((result, responseIndex) => {
      if (!result.success && INVALID_TOKEN_CODES.has(result.error?.code)) {
        invalidTokens.push(batch[responseIndex]);
      }
    });

    await Promise.all(
      invalidTokens.flatMap((token) =>
        tokenReferences
          .get(token)
          .map((userRef) =>
            userRef.update({ token: FieldValue.delete() })
          )
      )
    );

    if (invalidTokens.length > 0) {
      console.warn("Removed invalid FCM tokens", {
        count: invalidTokens.length,
        kind
      });
    }
  }

  console.info("FCM multicast completed", {
    kind,
    successCount,
    failureCount
  });

  return { successCount, failureCount };
}

async function claimFeedNotification(eventId) {
  const eventRef = db.collection("notificationEvents").doc(eventId);
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const eventSnap = await transaction.get(eventRef);

    if (eventSnap.exists) {
      const event = eventSnap.data();
      if (event.status === "sent") {
        return false;
      }
      if (event.status === "processing" && event.leaseUntil > now) {
        throw new Error("Feed notification is already being processed");
      }
    }

    transaction.set(
      eventRef,
      {
        status: "processing",
        leaseUntil: now + 2 * 60 * 1000,
        updatedAt: now
      },
      { merge: true }
    );
    return true;
  });
}

async function notifyFeedRecorded(eventId) {
  const eventRef = db.collection("notificationEvents").doc(eventId);
  const shouldSend = await claimFeedNotification(eventId);

  if (!shouldSend) {
    return;
  }

  try {
    const result = await sendPush(
      {
        title: "Woof! Dog Fed!",
        body: "🐶 Thanks for the brown rocks!"
      },
      "fed"
    );

    await eventRef.set(
      {
        status: "sent",
        sentAt: Date.now(),
        leaseUntil: FieldValue.delete()
      },
      { merge: true }
    );

    console.info("Feed notification completed", {
      eventId,
      ...result
    });
  } catch (error) {
    await eventRef.set(
      {
        status: "failed",
        leaseUntil: FieldValue.delete(),
        updatedAt: Date.now()
      },
      { merge: true }
    );
    throw error;
  }
}

exports.reconcileReminderOnStatusChange = onDocumentWritten(
  {
    document: "dog/status",
    region: REGION,
    retry: true
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) {
      return;
    }

    const before = event.data.before?.exists
      ? event.data.before.data()
      : {};
    const current = after.data();
    const wasFedAt = toMillis(before.lastFedAt);
    const isFedAt = toMillis(current.lastFedAt);

    const tasks = [
      reconcileReminderSchedule({ db })
    ];

    if (isFedAt !== null && isFedAt !== wasFedAt) {
      tasks.push(notifyFeedRecorded(event.id));
    }

    await Promise.all(tasks);
  }
);

exports.reconcileReminderOnSettingsChange = onDocumentWritten(
  {
    document: "dog/settings",
    region: REGION,
    retry: true
  },
  async (event) => {
    if (event.data?.after?.exists) {
      await reconcileReminderSchedule({ db });
    }
  }
);

exports.enqueueReminderTask = onDocumentWritten(
  {
    document: "dog/reminderScheduler",
    region: REGION,
    retry: true
  },
  async (event) => {
    const before = event.data?.before?.exists
      ? event.data.before.data()
      : {};
    const after = event.data?.after?.exists
      ? event.data.after.data()
      : null;

    if (!after?.nextTaskId || before.nextTaskId === after.nextTaskId) {
      return;
    }

    await enqueueReminderTask(REMINDER_TASK_QUEUE, after);
  }
);

exports.reminderDispatch = onTaskDispatched(
  {
    region: REGION,
    timeoutSeconds: 180,
    retryConfig: {
      maxAttempts: 0,
      minBackoffSeconds: 10,
      maxBackoffSeconds: 300,
      maxDoublings: 5
    },
    rateLimits: {
      maxConcurrentDispatches: 1
    }
  },
  async (request) => {
    const { generation, scheduledAt } = request.data || {};
    if (!Number.isSafeInteger(generation) || !Number.isFinite(scheduledAt)) {
      throw new TypeError("Reminder task payload is invalid");
    }

    const taskId = request.id;
    const statusRef = db.collection("dog").doc("status");
    const settingsRef = db.collection("dog").doc("settings");
    const schedulerRef = db.collection("dog").doc("reminderScheduler");
    const now = Date.now();

    const claimed = await db.runTransaction(async (transaction) => {
      const [statusSnap, settingsSnap, schedulerSnap] = await Promise.all([
        transaction.get(statusRef),
        transaction.get(settingsRef),
        transaction.get(schedulerRef)
      ]);

      if (!statusSnap.exists || !settingsSnap.exists || !schedulerSnap.exists) {
        return null;
      }

      const status = statusSnap.data();
      const settings = settingsSnap.data();
      const scheduler = schedulerSnap.data();
      const schedulerAt = toMillis(scheduler.nextReminderAt);
      const sourceSignature = getReminderInputSignature(status, settings);

      if (
        scheduler.generation !== generation ||
        scheduler.nextTaskId !== taskId ||
        schedulerAt !== scheduledAt ||
        scheduler.sourceSignature !== sourceSignature
      ) {
        return null;
      }

      if (scheduler.lastCompletedTaskId === taskId) {
        return null;
      }

      if (scheduledAt > now) {
        throw new Error("Reminder task was dispatched before its schedule time");
      }

      const activeLeaseUntil = toMillis(scheduler.activeTaskLeaseUntil);
      if (
        scheduler.activeTaskId &&
        scheduler.activeTaskId !== taskId &&
        activeLeaseUntil !== null &&
        activeLeaseUntil > now
      ) {
        throw new Error("Another reminder task is still being processed");
      }

      transaction.update(schedulerRef, {
        activeTaskId: taskId,
        activeTaskLeaseUntil: now + 3 * 60 * 1000
      });

      return { status, settings, sourceSignature };
    });

    if (!claimed) {
      console.info("Skipping stale reminder task", { taskId, generation });
      return;
    }

    let deliveryResult;
    try {
      deliveryResult = await sendPush(
        {
          title: "Woof! Feed Reminder!",
          body: "🐶 Time to feed the dog!"
        },
        "reminder"
      );
    } catch (error) {
      await db.runTransaction(async (transaction) => {
        const schedulerSnap = await transaction.get(schedulerRef);
        if (
          schedulerSnap.exists &&
          schedulerSnap.data().activeTaskId === taskId
        ) {
          transaction.update(schedulerRef, {
            activeTaskId: null,
            activeTaskLeaseUntil: null
          });
        }
      });
      throw error;
    }

    const completedAt = Date.now();
    await db.runTransaction(async (transaction) => {
      const [statusSnap, settingsSnap, schedulerSnap] = await Promise.all([
        transaction.get(statusRef),
        transaction.get(settingsRef),
        transaction.get(schedulerRef)
      ]);

      if (!statusSnap.exists || !settingsSnap.exists || !schedulerSnap.exists) {
        return;
      }

      const status = statusSnap.data();
      const settings = settingsSnap.data();
      const scheduler = schedulerSnap.data();

      if (
        scheduler.generation !== generation ||
        scheduler.nextTaskId !== taskId ||
        scheduler.sourceSignature !==
          getReminderInputSignature(status, settings)
      ) {
        return;
      }

      const nextStatus = {
        ...status,
        reminderSentAt: completedAt
      };
      const nextReminderAt = getNextReminderAt({
        status: nextStatus,
        settings,
        now: completedAt
      });
      const nextAt = nextReminderAt.getTime();

      transaction.update(statusRef, { reminderSentAt: completedAt });
      transaction.update(schedulerRef, {
        nextReminderAt,
        nextTaskId: createTaskId(generation, nextAt),
        lastCompletedTaskId: taskId,
        activeTaskId: null,
        activeTaskLeaseUntil: null
      });
    });

    console.info("Reminder task completed", {
      taskId,
      generation,
      ...deliveryResult
    });
  }
);
