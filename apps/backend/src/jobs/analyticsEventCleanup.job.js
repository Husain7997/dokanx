const cron = require("node-cron");
const Event = require("../models/event.model");

if (process.env.NODE_ENV === "test") {
  module.exports = {
    startAnalyticsEventCleanupCron: () => {},
  };
  return;
}

function resolveRetentionDays() {
  const raw = Number(process.env.ANALYTICS_EVENTS_RETENTION_DAYS || 90);
  if (!Number.isFinite(raw)) return 90;
  return Math.max(7, Math.min(raw, 3650));
}

function startAnalyticsEventCleanupCron() {
  if (process.env.ANALYTICS_EVENTS_CLEANUP_CRON !== "true") {
    return;
  }

  cron.schedule("30 4 * * *", async () => {
    try {
      const retentionDays = resolveRetentionDays();
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const result = await Event.deleteMany({ createdAt: { $lt: cutoff } });
      console.log(
        `Analytics events cleanup completed. deleted=${result.deletedCount || 0} retentionDays=${retentionDays}`
      );
    } catch (error) {
      console.error("Analytics events cleanup failed:", error);
    }
  });
}

module.exports = { startAnalyticsEventCleanupCron };
