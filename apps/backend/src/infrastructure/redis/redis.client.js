const Redis = require("ioredis");

let client;

if (!client) {
  client = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
  });

  client.on("connect", () =>
    console.log("✅ Redis connected")
  );

  client.on("error", (err) =>
    console.error("Redis error:", err)
  );
}

module.exports = client;
