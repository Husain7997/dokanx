const http = require("http");

const { createApp } = require("./createApp");
const loadEvents = require("../loaders/event.loader");
const { connectMongo, disconnectMongo } = require("../infrastructure/database/mongo.client");
const logger = require("@/core/infrastructure/logger");
const { redisClient } = require("@/system/singletons/redisClient");
const { closeQueueInfra } = require("@/platform/queue/queue.client");
const { registerWorkers } = require("../workers");

function registerProcessGuards() {
  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED:", err);
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    console.error("CRITICAL:", err);
    process.exit(1);
  });
}

async function startServer() {
  try {
    await connectMongo();
    logger.info("Mongo Connected");

    loadEvents();

    const stopWorkers = registerWorkers();
    const app = createApp();
    const server = http.createServer(app);

    require("../infrastructure/websocket/socket").init(server);
    require("../infrastructure/events/listeners");
    require("../infrastructure/notifications/notification.listener");

    const port = process.env.PORT || 5001;

    server.listen(port, () => {
      logger.info(`DokanX running on ${port}`);
    });

    require("../infrastructure/graceful/shutdown")(server, {
      beforeCloseServer: async () => {
        if (typeof stopWorkers === "function") {
          await stopWorkers();
        }
      },
      afterCloseServer: async () => {
        await closeQueueInfra().catch(() => {});
        await redisClient.quit().catch(() => {});
        await disconnectMongo().catch(() => {});
      },
    });

    return server;
  } catch (err) {
    console.error("BOOT ERROR DETAILS:", err);
    logger.error("Server Boot Failed", err);
    process.exit(1);
  }
}

module.exports = {
  registerProcessGuards,
  startServer,
};
