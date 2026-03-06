require("module-alias/register");
require("dotenv").config();

/*
|--------------------------------------------------------------------------
| GLOBAL PROCESS GUARDS
|--------------------------------------------------------------------------
*/

process.on("unhandledRejection", err => {
  console.error("UNHANDLED:", err);
  process.exit(1);
});

process.on("uncaughtException", err => {
  console.error("CRITICAL:", err);
  process.exit(1);
});

/*
|--------------------------------------------------------------------------
| IMPORTS
|--------------------------------------------------------------------------
*/

const http = require("http");

const app = require("./app");

const loadEvents =
  require("./loaders/event.loader");

const {
  connectMongo,
  disconnectMongo,
} = require("./infrastructure/database/mongo.client");

const logger = require("@/core/infrastructure/logger");
const { redisClient } = require("@/system/singletons/redisClient");
const { closeQueueInfra } = require("@/platform/queue/queue.client");

const { registerWorkers } =
  require("./workers");
/*
|--------------------------------------------------------------------------
| SERVER START
|--------------------------------------------------------------------------
*/

async function startServer() {

  try {

    /* ---------- DATABASE ---------- */
    await connectMongo();
    logger.info("Mongo Connected");

    /* ---------- EVENTS ---------- */
    loadEvents();

    /* ---------- WORKERS ---------- */

    const stopWorkers = registerWorkers();
    /* ---------- HTTP SERVER ---------- */
    const server = http.createServer(app);

    require("./infrastructure/websocket/socket")
      .init(server);

    require("./infrastructure/events/listeners");
    require("./infrastructure/notifications/notification.listener");

    const PORT = process.env.PORT || 5001;

    server.listen(PORT, () => {
      logger.info(`🚀 DokanX running on ${PORT}`);
    });

    require("./infrastructure/graceful/shutdown")(server, {
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

  } catch (err) {
  console.error("🔥 BOOT ERROR DETAILS:", err);
  logger.error("Server Boot Failed", err);
  process.exit(1);
}
}

startServer();
