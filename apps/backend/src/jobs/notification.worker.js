const { queues } = require("@/core/infrastructure");
const { dispatchNotification } =
  require("@/infrastructure/notifications/notification.service");

queues.analytics.process("notification", 3, async (job) => {
  await dispatchNotification(job.data || {});
  return { ok: true };
});
