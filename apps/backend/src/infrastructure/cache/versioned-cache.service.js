const crypto = require("crypto");

const cache = require("../redis/cache.service");
const { redis } = require("@/core/infrastructure");

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeValue(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function buildHash(input) {
  return crypto.createHash("sha1").update(JSON.stringify(normalizeValue(input))).digest("hex");
}

async function getNamespaceVersion(namespace) {
  try {
    const key = `cache:namespace:${namespace}:version`;
    const current = await redis.get(key);
    if (current) return current;
    await redis.set(key, "1", "EX", 60 * 60 * 24 * 30);
    return "1";
  } catch {
    return "1";
  }
}

async function getOrSet({ namespace, key, ttlSeconds = 60, resolver }) {
  try {
    const version = await getNamespaceVersion(namespace);
    const cacheKey = `cache:${namespace}:v${version}:${buildHash(key)}`;
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      return {
        hit: true,
        value: cached,
      };
    }

    const fresh = await resolver();
    await cache.set(cacheKey, fresh, ttlSeconds);
    return {
      hit: false,
      value: fresh,
    };
  } catch {
    return {
      hit: false,
      value: await resolver(),
    };
  }
}

async function bumpNamespace(namespace) {
  try {
    await redis.incr(`cache:namespace:${namespace}:version`);
  } catch {
    // Ignore cache invalidation failures to keep writes available.
  }
}

module.exports = {
  getOrSet,
  bumpNamespace,
};
