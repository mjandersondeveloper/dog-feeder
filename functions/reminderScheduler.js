const crypto = require("node:crypto");
const {
  getNextReminderAt,
  getReminderInputSignature,
  toMillis
} = require("./reminderLogic");

function createTaskId(generation, scheduledAt) {
  const hash = crypto
    .createHash("sha256")
    .update(`dog-reminder:${generation}:${scheduledAt}`)
    .digest("hex");

  return `reminder-${hash}`;
}

async function reconcileReminderSchedule({ db, now = Date.now() }) {
  const statusRef = db.collection("dog").doc("status");
  const settingsRef = db.collection("dog").doc("settings");
  const schedulerRef = db.collection("dog").doc("reminderScheduler");
  let schedule = null;

  await db.runTransaction(async (transaction) => {
    const [statusSnap, settingsSnap, schedulerSnap] = await Promise.all([
      transaction.get(statusRef),
      transaction.get(settingsRef),
      transaction.get(schedulerRef)
    ]);

    if (!statusSnap.exists || !settingsSnap.exists) {
      return;
    }

    const status = statusSnap.data();
    const settings = settingsSnap.data();
    const current = schedulerSnap.exists ? schedulerSnap.data() : {};
    const sourceSignature = getReminderInputSignature(status, settings);

    if (
      current.sourceSignature === sourceSignature &&
      current.nextTaskId &&
      current.nextReminderAt
    ) {
      schedule = {
        generation: current.generation,
        nextReminderAt: current.nextReminderAt,
        nextTaskId: current.nextTaskId
      };
      return;
    }

    const generation = Number.isSafeInteger(current.generation)
      ? current.generation + 1
      : 1;
    const nextReminderAt = getNextReminderAt({
      status,
      settings,
      now
    });
    const scheduledAt = nextReminderAt.getTime();
    const nextTaskId = createTaskId(generation, scheduledAt);

    schedule = {
      generation,
      nextReminderAt,
      nextTaskId
    };

    transaction.set(
      schedulerRef,
      {
        generation,
        sourceSignature,
        nextReminderAt,
        nextTaskId,
        activeTaskId: null,
        activeTaskLeaseUntil: null
      },
      { merge: true }
    );
  });

  return schedule;
}

function getScheduledAt(schedule) {
  return toMillis(schedule.nextReminderAt);
}

function isTaskAlreadyExists(error) {
  return (
    error?.code === "functions/task-already-exists" ||
    error?.code === "ALREADY_EXISTS"
  );
}

async function enqueueReminderTask(taskQueue, schedule) {
  if (!schedule?.nextTaskId || !schedule.nextReminderAt) {
    return;
  }

  const scheduledAt = getScheduledAt(schedule);

  try {
    await taskQueue.enqueue(
      {
        generation: schedule.generation,
        scheduledAt
      },
      {
        id: schedule.nextTaskId,
        scheduleTime: new Date(scheduledAt)
      }
    );
  } catch (error) {
    if (isTaskAlreadyExists(error)) {
      return;
    }
    throw error;
  }
}

module.exports = {
  createTaskId,
  enqueueReminderTask,
  reconcileReminderSchedule
};
