const { t } = require("@/core/language");
const { logger } = require("@/core/infrastructure");

module.exports = function errorHandler(err, req, res, next) {
  logger.error(
    {
      err: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    },
    "Unhandled request error"
  );

  const lang = req.lang || "en";

  const status = err.statusCode || 500;
  const key = err.messageKey || "errors.UNKNOWN_ERROR";

  res.status(status).json({
    success: false,
    message: t(lang, key),
    requestId: req.requestId || null,
  });
};
