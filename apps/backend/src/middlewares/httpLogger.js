const pinoHttp = require("pino-http");
const logger = require("../core/infrastructure/logger"); // relative path

const httpLogger = pinoHttp({
  logger, // pass the actual pino instance
  customProps: (req) => ({
    requestId: req.requestId,
  }),
});

module.exports = httpLogger; // export middleware