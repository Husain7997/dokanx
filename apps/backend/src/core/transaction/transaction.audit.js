// src/core/transaction/transaction.audit.js

let logger;

try {
  const infra = require("@/core/infrastructure");
  logger = infra?.logger;
} catch (err) {
  logger = console;
}

const safeLog = {
  info: (...args) =>
    logger?.info ? logger.info(...args) : console.log(...args),

  error: (...args) =>
    logger?.error ? logger.error(...args) : console.error(...args),
};

process.on("unhandledRejection", (err) => {
  safeLog.error("Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
  safeLog.error("Uncaught Exception:", err);
});

safeLog.info("Transaction Audit Layer Initialized");