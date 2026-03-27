const { t } = require("@/core/language");
const logger = require("@/core/infrastructure/logger");

function isRetryableStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

module.exports = function errorHandler(err, req, res, next) {
  const status = Number(err?.statusCode || err?.status || 500);
  const key = err?.messageKey || "errors.UNKNOWN_ERROR";
  const code = err?.code || key;
  const requestId = req?.requestId || req?.headers?.["x-request-id"] || null;
  const retryable = typeof err?.retryable === "boolean"
    ? err.retryable
    : isRetryableStatus(status);

  const lang = req.lang || "en";

  logger.error({
    event: "HTTP_REQUEST_FAILED",
    requestId,
    method: req?.method || null,
    path: req?.originalUrl || req?.url || null,
    statusCode: status,
    code,
    retryable,
    message: err?.message || "Unknown error",
    stack: err?.stack || null,
  }, "HTTP request failed");

  res.status(status).json({
    success: false,
    message: t(lang, key),
    code,
    requestId,
    retryable,
    details: process.env.NODE_ENV === "production" ? undefined : (err?.details || err?.message || null),
  });
};
