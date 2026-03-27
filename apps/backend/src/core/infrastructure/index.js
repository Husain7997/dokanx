// src/core/infrastructure/index.js

const redis = require("./redis.client");
const queueEngine = require("./queue.engine");
const lockManager = require("./lock.manager");
const logger = require("./logger");
const { runOnce } = require("../idempotency/idempotency.helper");
const { t: translate } = require("../../infrastructure/translation/translation.service");
const { publishEvent: dispatchEvent } = require("../../infrastructure/events/event.dispatcher");

function t(keyOrLang, maybeLang, vars = {}) {
  const first = String(keyOrLang || "");
  const second = String(maybeLang || "");
  const langFirst = first === "en" || first === "bn";
  const lang = langFirst ? first : second || "en";
  const key = langFirst ? second : first;

  if (!key) {
    return "";
  }

  return translate(lang || "en", key, vars);
}

function publishEvent(typeOrEvent, payload, meta = {}) {
  if (typeOrEvent && typeof typeOrEvent === "object" && !Array.isArray(typeOrEvent)) {
    const event = typeOrEvent;
    return dispatchEvent(event.type, event.payload, {
      aggregateId: event.aggregateId || null,
      ...event.meta,
    });
  }

  return dispatchEvent(typeOrEvent, payload, meta);
}


module.exports = {
  redis,
  queue: queueEngine.queue,
  queues: queueEngine.queues,
  addJob: queueEngine.addJob,
  getQueue: queueEngine.getQueue,
  getQueueStatus: queueEngine.getQueueStatus,
  lockManager,
  acquireLock: lockManager.acquireLock,
  withLock: lockManager.withLock,
  assertLockManagerHealthy: lockManager.assertLockManagerHealthy,
  logger,
  runOnce,
  t,
  publishEvent,

};
