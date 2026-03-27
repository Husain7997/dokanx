const paymentQueue = require("./payment.queue");
const webhookQueue = require("./webhook.queue");
const analyticsQueue = require("./analytics.queue");

const compatibilityQueue = paymentQueue.queue;

const queues = {
  default: paymentQueue,
  payments: paymentQueue,
  webhooks: webhookQueue,
  analytics: analyticsQueue,
};

const queueNameByJob = {
  payout: "payments",
  settlement: "payments",
  "payment-processing": "payments",
  "webhook-delivery": "webhooks",
  "sandbox-webhook-simulation": "webhooks",
  notification: "analytics",
  collectSignals: "analytics",
  predictInventoryRisk: "analytics",
  executeActions: "analytics",
};

function resolveQueue(name, opts = {}) {
  const queueName = opts.queueName || queueNameByJob[name] || "payments";
  return queues[queueName] || paymentQueue;
}

function addJob(name, data, opts = {}) {
  const targetQueue = resolveQueue(name, opts);
  const { queueName, ...jobOptions } = opts;
  return targetQueue.add(name, data, jobOptions);
}

function getQueue(name = "payments") {
  return resolveQueue(name, { queueName: name });
}

async function getQueueStatus() {
  const statuses = await Promise.all(
    Object.entries(queues).map(async ([key, queueDef]) => [key, await queueDef.getStatus()])
  );
  return Object.fromEntries(statuses);
}

module.exports = {
  queue: compatibilityQueue,
  queues,
  addJob,
  getQueue,
  resolveQueue,
  getQueueStatus,
  queueNameByJob,
};
