// src/system/singletons/redisClient.js

let redisClient;

if (process.env.NODE_ENV === "test") {
  const store = new Map();
  redisClient = {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async set(key, value, ...args) {
      store.set(key, String(value));
      if (
        args.length >= 2 &&
        String(args[0]).toUpperCase() === "EX" &&
        Number.isFinite(Number(args[1]))
      ) {
        setTimeout(() => store.delete(key), Number(args[1]) * 1000).unref?.();
      }
      return "OK";
    },
    async del(key) {
      return store.delete(key) ? 1 : 0;
    },
    async incr(key) {
      const next = Number(store.get(key) || 0) + 1;
      store.set(key, String(next));
      return next;
    },
    async expire(_key, _seconds) {
      return 1;
    },
    async ping() {
      return "PONG";
    },
    duplicate() {
      return this;
    },
    on() {
      return this;
    },
    async quit() {
      store.clear();
      return "OK";
    }
  };
} else {
  const Redis = require("ioredis");
  redisClient = new Redis(process.env.REDIS_URL);
}

module.exports = { redisClient };
