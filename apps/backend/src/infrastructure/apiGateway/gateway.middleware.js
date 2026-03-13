const { logger } = require("@/core/infrastructure");

module.exports = (req, res, next) => {
  req.requestId = Date.now() + "-" + Math.random();

  if (process.env.VERBOSE_HTTP_LOGS === "true") {
    logger.debug(
      {
        method: req.method,
        url: req.originalUrl,
        requestId: req.requestId,
      },
      "Request received"
    );
  }

  next();
};
