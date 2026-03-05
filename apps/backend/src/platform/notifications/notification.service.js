const { queues } = require("@/platform/queue/queues");

async function enqueueNotification({
  tenantId,
  userId,
  channels = ["inapp"],
  message,
  subject,
  to,
  data = {},
  idempotencyKey
}) {
  if (!message) {
    throw new Error("Notification message is required");
  }

  return queues.notification.add("notification.send", {
    tenantId,
    userId,
    channels,
    message,
    subject,
    to,
    data,
    idempotencyKey: idempotencyKey || `notify_${Date.now()}`
  });
}

module.exports = {
  enqueueNotification
};
