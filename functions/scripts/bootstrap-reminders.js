const admin = require("firebase-admin");
const { reconcileReminderSchedule } = require("../reminderScheduler");

admin.initializeApp();

reconcileReminderSchedule({
  db: admin.firestore()
})
  .then((schedule) => {
    if (!schedule) {
      throw new Error("Dog status or reminder settings document is missing");
    }

    console.log("Initial reminder task scheduled", {
      generation: schedule.generation,
      nextReminderAt: schedule.nextReminderAt.toISOString()
    });
  })
  .catch((error) => {
    console.error("Failed to initialize reminder schedule:", error);
    process.exitCode = 1;
  });
