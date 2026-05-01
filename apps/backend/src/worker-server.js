require("module-alias/register");
require("dotenv").config();

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("CRITICAL:", err);
  process.exit(1);
});

const loadEvents = require("./loaders/event.loader");
const { connectMongo } = require("./infrastructure/database/mongo.client");
const { logger, assertLockManagerHealthy } = require("@/core/infrastructure");
const { registerWorkers } = require("./workers");

async function startWorkerServer() {
  try {
    assertLockManagerHealthy();
    await connectMongo({ reason: "worker-startup" });
    loadEvents();
    registerWorkers();

    logger.info({
      queueWorkers: process.env.RUN_QUEUE_WORKERS !== "false",
      scheduledJobs: process.env.RUN_SCHEDULED_JOBS !== "false",
    }, "DokanX worker process started");
  } catch (err) {
    console.error("WORKER BOOT ERROR DETAILS:", err);
    logger.error("Worker Boot Failed", err);
    process.exit(1);
  }
}

startWorkerServer();
