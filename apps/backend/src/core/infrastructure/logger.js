const pino = require("pino");
const { getRequestContext } = require("../../middlewares/requestContext");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  mixin() {
    const context = getRequestContext();
    return context
      ? {
          requestId: context.requestId || null,
          correlationId: context.correlationId || null,
        }
      : {};
  },
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

module.exports = logger;
