const REMINDER_INTERVAL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_TIME_ZONE = "America/New_York";

function toMillis(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date) {
    const millis = value.getTime();
    if (Number.isFinite(millis)) {
      return millis;
    }
  }

  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value && typeof value.toDate === "function") {
    return toMillis(value.toDate());
  }

  if (typeof value === "string") {
    const millis = Date.parse(value);
    if (Number.isFinite(millis)) {
      return millis;
    }
  }

  throw new TypeError("Invalid timestamp value");
}

function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23"
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
}

function getTimeZoneOffset(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  const localTimeAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return localTimeAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function dateAtLocalTime(parts, hour, minute, timeZone) {
  const localTimeAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    minute
  );
  let timestamp = localTimeAsUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    timestamp = localTimeAsUtc - getTimeZoneOffset(new Date(timestamp), timeZone);
  }

  return new Date(timestamp);
}

function addCalendarDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function sameLocalDate(left, right, timeZone) {
  const leftParts = getZonedParts(left, timeZone);
  const rightParts = getZonedParts(right, timeZone);

  return (
    leftParts.year === rightParts.year &&
    leftParts.month === rightParts.month &&
    leftParts.day === rightParts.day
  );
}

function getReminderTime(settings) {
  const hour = settings.reminderHour ?? 18;
  const minute = settings.reminderMinute ?? 0;

  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new RangeError("Reminder time must be a valid hour and minute");
  }

  return { hour, minute };
}

function getNextReminderAt({
  status = {},
  settings = {},
  now = Date.now(),
  timeZone = DEFAULT_TIME_ZONE
}) {
  const nowMillis = toMillis(now);
  if (nowMillis === null) {
    throw new TypeError("A valid current time is required");
  }

  const nowDate = new Date(nowMillis);
  const today = getZonedParts(nowDate, timeZone);
  const { hour, minute } = getReminderTime(settings);
  const lastFedAt = toMillis(status.lastFedAt);
  const reminderSentAt = toMillis(status.reminderSentAt);
  const snoozedUntil = toMillis(status.snoozedUntil);

  let nextReminderAt;

  if (
    lastFedAt !== null &&
    sameLocalDate(new Date(lastFedAt), nowDate, timeZone)
  ) {
    const tomorrow = addCalendarDays(today, 1);
    nextReminderAt = dateAtLocalTime(tomorrow, hour, minute, timeZone).getTime();
  } else {
    const reminderCycleActive =
      reminderSentAt !== null &&
      (lastFedAt === null || reminderSentAt > lastFedAt);

    if (reminderCycleActive) {
      nextReminderAt = Math.max(
        nowMillis,
        reminderSentAt + REMINDER_INTERVAL_MS
      );
    } else {
      nextReminderAt = Math.max(
        nowMillis,
        dateAtLocalTime(today, hour, minute, timeZone).getTime()
      );
    }
  }

  if (snoozedUntil !== null) {
    nextReminderAt = Math.max(nextReminderAt, snoozedUntil);
  }

  return new Date(nextReminderAt);
}

function getReminderInputSignature(status, settings) {
  const { hour, minute } = getReminderTime(settings);

  return JSON.stringify([
    toMillis(status.lastFedAt),
    toMillis(status.snoozedUntil),
    hour,
    minute
  ]);
}

module.exports = {
  DEFAULT_TIME_ZONE,
  REMINDER_INTERVAL_MS,
  getNextReminderAt,
  getReminderInputSignature,
  toMillis
};
