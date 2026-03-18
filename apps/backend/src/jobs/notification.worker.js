const { queue } = require("@/core/infrastructure");
const { dispatchNotification } =
  require("@/infrastructure/notifications/notification.service");

queue.process("notification", async (job) => {
  await dispatchNotification(job.data || {});
  return { ok: true };
});
