const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createTaskId,
  enqueueReminderTask
} = require("../reminderScheduler");

test("task ids are deterministic and change with generation or schedule", () => {
  const first = createTaskId(2, 1_800_000_000_000);

  assert.equal(first, createTaskId(2, 1_800_000_000_000));
  assert.notEqual(first, createTaskId(3, 1_800_000_000_000));
  assert.notEqual(first, createTaskId(2, 1_800_000_000_001));
});

test("enqueue uses the stable task id and exact scheduled time", async () => {
  const scheduledAt = 1_800_000_000_000;
  const schedule = {
    generation: 4,
    nextReminderAt: new Date(scheduledAt),
    nextTaskId: createTaskId(4, scheduledAt)
  };
  let actual;
  const taskQueue = {
    async enqueue(data, options) {
      actual = { data, options };
    }
  };

  await enqueueReminderTask(taskQueue, schedule);

  assert.deepEqual(actual, {
    data: { generation: 4, scheduledAt },
    options: {
      id: schedule.nextTaskId,
      scheduleTime: new Date(scheduledAt)
    }
  });
});

test("enqueue treats an existing task id as an idempotent retry", async () => {
  const scheduledAt = 1_800_000_000_000;
  const schedule = {
    generation: 4,
    nextReminderAt: new Date(scheduledAt),
    nextTaskId: createTaskId(4, scheduledAt)
  };
  const taskQueue = {
    async enqueue() {
      const error = new Error("Already exists");
      error.code = "functions/task-already-exists";
      throw error;
    }
  };

  await assert.doesNotReject(() => enqueueReminderTask(taskQueue, schedule));
});

test("enqueue surfaces errors other than task id collisions", async () => {
  const taskQueue = {
    async enqueue() {
      throw new Error("Permission denied");
    }
  };

  await assert.rejects(
    () =>
      enqueueReminderTask(taskQueue, {
        generation: 4,
        nextReminderAt: new Date(1_800_000_000_000),
        nextTaskId: "reminder-id"
      }),
    /Permission denied/
  );
});
