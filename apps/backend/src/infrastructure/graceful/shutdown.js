module.exports = (server, hooks = {}) => {
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`Graceful shutdown (${signal})`);

    const forceExitTimer = setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 15000));

    forceExitTimer.unref?.();

    try {
      if (hooks.beforeCloseServer) {
        await hooks.beforeCloseServer();
      }

      await new Promise((resolve) => {
        server.close(() => resolve());
      });

      if (hooks.afterCloseServer) {
        await hooks.afterCloseServer();
      }

      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (err) {
      clearTimeout(forceExitTimer);
      console.error("Graceful shutdown failed:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};
