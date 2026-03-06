// src/core/infrastructure/logger.js
const pino = require("pino");

const isDev = process.env.NODE_ENV !== "production";
const isTest = process.env.NODE_ENV === "test";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isDev && !isTest
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

module.exports = logger; // ✅ export the logger instance directly
