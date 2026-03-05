const mongoose = require("mongoose");
const { redisClient } = require("@/core/infrastructure");
const { getBucketMetrics } = require("./metrics.service");
const { getDeadLetterReport } = require("@/platform/queue/deadLetter.monitor");

async function getSystemHealth() {
  let redis = "down";
  try {
    await redisClient.ping();
    redis = "up";
  } catch (_err) {
    redis = "down";
  }

  return {
    status: mongoose.connection.readyState === 1 && redis === "up" ? "OK" : "DEGRADED",
    uptime: process.uptime(),
    timestamp: Date.now(),
    services: {
      mongo: mongoose.connection.readyState === 1 ? "up" : "down",
      redis
    }
  };
}

async function getSystemMetrics({ tenantId = null, minutes = 60 } = {}) {
  return getBucketMetrics({ tenantId, minutes });
}

async function getQueueDeadLetterMetrics(sampleSize = 10) {
  return getDeadLetterReport(sampleSize);
}

module.exports = {
  getSystemHealth,
  getSystemMetrics,
  getQueueDeadLetterMetrics
};
