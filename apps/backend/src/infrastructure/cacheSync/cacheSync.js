const bus =
require("@/core/infrastructure");

const { redis } = require("@/core/infrastructure");

bus.on("CACHE_INVALIDATE", async (key) => {
  await redis.del(key);
});
