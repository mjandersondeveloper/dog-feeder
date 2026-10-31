const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getNextReminderAt,
  getReminderInputSignature
} = require("../reminderLogic");

const settings = {
  reminderHour: 18,
  reminderMinute: 0
};

test("schedules the configured reminder using America/New_York across DST", () => {
  const nextReminderAt = getNextReminderAt({
    settings,
    now: Date.parse("2026-03-08T16:00:00.000Z")
  });

  assert.equal(nextReminderAt.toISOString(), "2026-03-08T22:00:00.000Z");
});

test("waits until tomorrow's local reminder time after a same-day feed", () => {
  const nextReminderAt = getNextReminderAt({
    status: { lastFedAt: Date.parse("2026-03-08T14:30:00.000Z") },
    settings,
    now: Date.parse("2026-03-08T15:00:00.000Z")
  });

  assert.equal(nextReminderAt.toISOString(), "2026-03-09T22:00:00.000Z");
});

test("continues four-hour reminders overnight until a feed is recorded", () => {
  const nextReminderAt = getNextReminderAt({
    status: {
      lastFedAt: Date.parse("2026-03-09T12:00:00.000Z"),
      reminderSentAt: Date.parse("2026-03-10T03:00:00.000Z")
    },
    settings,
    now: Date.parse("2026-03-10T05:00:00.000Z")
  });

  assert.equal(nextReminderAt.toISOString(), "2026-03-10T07:00:00.000Z");
});

test("a snooze postpones the next reminder without changing its four-hour cadence", () => {
  const nextReminderAt = getNextReminderAt({
    status: {
      reminderSentAt: Date.parse("2026-03-08T22:00:00.000Z"),
      snoozedUntil: Date.parse("2026-03-09T05:00:00.000Z")
    },
    settings,
    now: Date.parse("2026-03-09T01:00:00.000Z")
  });

  assert.equal(nextReminderAt.toISOString(), "2026-03-09T05:00:00.000Z");
});

test("reminder input signatures change for feed, snooze, and schedule updates", () => {
  const baseline = getReminderInputSignature({}, settings);

  assert.notEqual(
    getReminderInputSignature(
      { lastFedAt: Date.parse("2026-03-08T14:30:00.000Z") },
      settings
    ),
    baseline
  );
  assert.notEqual(
    getReminderInputSignature(
      { snoozedUntil: Date.parse("2026-03-08T22:00:00.000Z") },
      settings
    ),
    baseline
  );
  assert.notEqual(
    getReminderInputSignature({}, { reminderHour: 19, reminderMinute: 0 }),
    baseline
  );
});
