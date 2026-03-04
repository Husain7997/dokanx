// src/core/infrastructure/lock.manager.js

const Redlock = require("redlock").default;
const redis = require("./redis.client");

// single redis instance
const redlock = new Redlock(
  [redis],
  {
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 200,
  }
);

/**
 * Acquire distributed lock
 */
async function acquireLock(key, ttl = 5000) {
  return redlock.acquire([`lock:${key}`], ttl);
}

/**
 * Execute function with lock
 */


exports.withLock = async (key, fn) => {

  const lockKey = `lock:${key}`;

  const ok = await redis.set(
    lockKey,
    "1",
    "NX",
    "PX",
    15000
  );

  if (!ok)
    throw new Error("Resource busy");

  try {
    return await fn();
  } finally {
    await redis.del(lockKey);
  }
};

module.exports = {
  acquireLock,

};