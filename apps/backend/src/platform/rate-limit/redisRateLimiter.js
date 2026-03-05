const { redisClient } = require("@/core/infrastructure");

const memoryCounter = new Map();

function buildKey(req, scope) {
  const tenant = req.shop?._id || req.user?.shopId || "global";
  const actor = req.user?._id || req.ip;
  return `ratelimit:${scope}:${tenant}:${actor}`;
}

function memoryLimit(key, limit, windowSec) {
  const now = Date.now();
  const row = memoryCounter.get(key);
  if (!row || row.exp <= now) {
    memoryCounter.set(key, { count: 1, exp: now + windowSec * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }

  row.count += 1;
  const allowed = row.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - row.count)
  };
}

function redisRateLimiter({ scope, limit = 20, windowSec = 60 }) {
  return async (req, res, next) => {
    const key = buildKey(req, scope);

    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, windowSec);
      }

      if (count > limit) {
        return res.status(429).json({ message: "Too many requests" });
      }

      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
      return next();
    } catch (_err) {
      const state = memoryLimit(key, limit, windowSec);
      if (!state.allowed) {
        return res.status(429).json({ message: "Too many requests" });
      }
      return next();
    }
  };
}

module.exports = {
  redisRateLimiter
};
