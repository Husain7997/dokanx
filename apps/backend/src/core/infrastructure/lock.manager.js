const crypto = require("crypto");
const Redlock = require("redlock").default;
const redis = require("./redis.client");

const LOCK_PREFIX = "lock:";
const DEFAULT_TTL_MS = 15000;

const redlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 200,
});

function buildLockKey(key) {
  return `${LOCK_PREFIX}${key}`;
}

function buildOwnerToken() {
  return crypto.randomUUID();
}

async function acquireLock(key, ttl = 5000) {
  return redlock.acquire([buildLockKey(key)], ttl);
}

async function releaseOwnedLock(lockKey, ownerToken) {
  const releaseScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    end
    return 0
  `;
  return redis.eval(releaseScript, 1, lockKey, ownerToken);
}

async function withLock(key, fn, options = {}) {
  const lockKey = buildLockKey(key);
  const ownerToken = buildOwnerToken();
  const ttl = Number(options.ttl || DEFAULT_TTL_MS);

  const ok = await redis.set(lockKey, ownerToken, "NX", "PX", ttl);
  if (!ok) {
    const error = new Error("Resource busy");
    error.statusCode = 409;
    throw error;
  }

  try {
    return await fn();
  } finally {
    await releaseOwnedLock(lockKey, ownerToken);
  }
}

function assertLockManagerHealthy() {
  if (typeof withLock !== "function") {
    throw new Error("LOCK_MANAGER_WITHLOCK_INVALID");
  }
  if (typeof acquireLock !== "function") {
    throw new Error("LOCK_MANAGER_ACQUIRE_INVALID");
  }
}

module.exports = {
  acquireLock,
  assertLockManagerHealthy,
  withLock,
};
