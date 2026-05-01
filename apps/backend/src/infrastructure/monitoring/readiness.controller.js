const { mongoose, getMongoState } = require("../database/mongo.client");
const redis = require("@/core/infrastructure/redis.client");

const REDIS_PING_TIMEOUT_MS = Number(process.env.READINESS_REDIS_TIMEOUT_MS || 1000);

async function getRedisState() {
  const baseState = {
    status: redis?.status || "unknown",
    connected: redis?.status === "ready" || redis?.status === "connect",
  };

  if (!redis || typeof redis.ping !== "function") {
    return {
      ...baseState,
      connected: false,
      ping: "unavailable",
    };
  }

  try {
    const ping = await Promise.race([
      redis.ping(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Redis ping timeout")), REDIS_PING_TIMEOUT_MS);
      }),
    ]);

    return {
      ...baseState,
      connected: true,
      ping,
    };
  } catch (error) {
    return {
      ...baseState,
      connected: false,
      ping: "failed",
      error: error.message,
    };
  }
}

exports.readinessCheck = async (_req, res) => {
  try {
    const mongoState = getMongoState();
    const redisState = await getRedisState();
    const isReady = mongoose.connection.readyState === 1 && redisState.connected;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? "ready" : "not-ready",
      services: {
        database: mongoState,
        redis: redisState,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "not-ready",
      error: err.message,
    });
  }
};
