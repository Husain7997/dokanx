const { redisClient } = require("./redisClient");

const lockManager = {
  async acquire(key) {
    const lockKey = `lock:${key}`;
    const result = await redisClient.set(lockKey, "1", "NX", "EX", 5);
    return result === "OK";
  },

  async release(key) {
    await redisClient.del(`lock:${key}`);
  }
};

module.exports = { lockManager };