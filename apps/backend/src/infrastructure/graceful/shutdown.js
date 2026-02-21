module.exports = (server) => {

  const shutdown = () => {
    console.log("Graceful shutdown");

    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};
