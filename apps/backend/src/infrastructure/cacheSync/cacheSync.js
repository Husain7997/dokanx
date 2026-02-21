const bus =
require("../events/eventBus");

const redis =
require("../redis/redis.client");

bus.on("CACHE_INVALIDATE", async (key) => {
  await redis.del(key);
});
