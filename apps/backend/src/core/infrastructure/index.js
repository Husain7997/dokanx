// src/core/infrastructure/index.js

const { eventBus } = require("@/system/singletons/eventBus");
const { lockManager } = require("@/system/singletons/lockManager");
const { redisClient } = require("@/system/singletons/redisClient");
const { notificationDispatcher } = require("@/system/singletons/notificationDispatcher");
const logger = require("./logger");
const { queue, addJob } = require("./queue.engine");
const { runOnce } = require("@/core/idempotency/idempotency.helper");
const { t } = require("@/core/language");

let withLock = async (_name, fn) => fn();
try {
  ({ withLock } = require("@/system/locks/lock.service"));
} catch (_err) {
  // Fallback keeps application booting where legacy lock module is incomplete.
}

async function publishEvent(eventOrType, payload = {}) {
  if (typeof eventOrType === "string") {
    eventBus.emit(eventOrType, payload);
    return;
  }

  const type = eventOrType?.type;
  const data = eventOrType?.payload ?? payload;
  if (!type) return;
  eventBus.emit(type, data);
}

module.exports = {
  eventBus,
  lockManager,
  redisClient,
  notificationDispatcher,
  logger,
  queue,
  addJob,
  runOnce,
  withLock,
  t,
  publishEvent,
};
