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
} = require("./infrastructure/database/mongo.client");

const { logger } =
  require("@/core/infrastructure");
const { assertLockManagerHealthy } =
  require("@/core/infrastructure");

const { registerWorkers } =
  require("./workers");
/*
|--------------------------------------------------------------------------
| SERVER START
|--------------------------------------------------------------------------
*/

async function startServer() {

  try {
    assertLockManagerHealthy();
    logger.info("Lock manager self-test passed");

    /* ---------- EVENTS ---------- */
    loadEvents();

    /* ---------- WORKERS ---------- */
    registerWorkers();

    /* ---------- HTTP SERVER ---------- */
    const server = http.createServer(app);

    require("./infrastructure/websocket/socket")
      .init(server);

    require("./infrastructure/events/listeners");
    require("./infrastructure/notifications/notification.listener");

    const PORT = process.env.PORT || 5001;

    server.listen(PORT, () => {
      logger.info("DokanX running on " + PORT);
    });

    void connectMongo({ reason: "startup", background: true });
    logger.info("Mongo connection bootstrap scheduled");

    require("./infrastructure/graceful/shutdown")(server);

  } catch (err) {
    console.error("BOOT ERROR DETAILS:", err);
    logger.error("Server Boot Failed", err);
    process.exit(1);
  }
}

startServer();
