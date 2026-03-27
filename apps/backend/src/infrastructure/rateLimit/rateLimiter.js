const { redis } = require("@/core/infrastructure");

const inMemoryBuckets = new Map();

function buildKey(req, bucket) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `global-rate:${ip}:${bucket}`;
}

function isRedisReady() {
  return redis && (redis.status === "ready" || redis.status === "connect");
}

async function incrementWindow(key, ttlSeconds) {
  if (!isRedisReady()) {
    throw new Error("Redis unavailable for rate limiting");
  }

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
}

function incrementInMemory(key, ttlSeconds) {
  const now = Date.now();
  const existing = inMemoryBuckets.get(key);
  if (!existing || existing.expiresAt <= now) {
    inMemoryBuckets.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

module.exports = async function scalableRateLimiter(req, res, next) {
  try {
    const perMinute = Number(process.env.GLOBAL_RATE_LIMIT_PER_MINUTE || 500);
    const minuteBucket = Math.floor(Date.now() / 60000);
    const count = await incrementWindow(buildKey(req, minuteBucket), 60);
    if (count > perMinute) {
      return res.status(429).json({ message: "Too many requests" });
    }
    return next();
  } catch (_error) {
    const perMinute = Number(process.env.GLOBAL_RATE_LIMIT_PER_MINUTE || 500);
    const minuteBucket = Math.floor(Date.now() / 60000);
    const count = incrementInMemory(buildKey(req, minuteBucket), 60);
    if (count > perMinute) {
      return res.status(429).json({ message: "Too many requests" });
    }
    return next();
  }
};
