const { redis } = require("@/core/infrastructure");

function buildKey(req, bucket) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `global-rate:${ip}:${bucket}`;
}

async function incrementWindow(key, ttlSeconds) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
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
    return next();
  }
};
