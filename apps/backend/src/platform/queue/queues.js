const { createQueue } = require("./queue.client");

const QUEUE_NAMES = {
  EMAIL: "email.queue",
  NOTIFICATION: "notification.queue",
  SETTLEMENT: "settlement.queue",
  ANALYTICS: "analytics.queue",
  AI_SIGNAL: "ai-signal.queue"
};

const queues = {
  email: createQueue(QUEUE_NAMES.EMAIL),
  notification: createQueue(QUEUE_NAMES.NOTIFICATION),
  settlement: createQueue(QUEUE_NAMES.SETTLEMENT),
  analytics: createQueue(QUEUE_NAMES.ANALYTICS),
  aiSignal: createQueue(QUEUE_NAMES.AI_SIGNAL)
};

function eventToQueue(eventName) {
  if (!eventName) return queues.analytics;
  if (eventName.startsWith("order.")) return queues.analytics;
  if (eventName.startsWith("wallet.")) return queues.settlement;
  if (eventName.startsWith("inventory.")) return queues.analytics;
  if (eventName.startsWith("notification.")) return queues.notification;
  return queues.aiSignal;
}

async function enqueueByEvent(eventName, payload) {
  const q = eventToQueue(eventName);
  return q.add(eventName, payload || {});
}

module.exports = {
  QUEUE_NAMES,
  queues,
  enqueueByEvent
};
