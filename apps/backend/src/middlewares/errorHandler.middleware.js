const { t } = require("@/core/language");

module.exports = function errorHandler(err, req, res, next) {
  console.error("[ERROR]", err);

  const lang = req.lang || "en";

  const status = err.statusCode || 500;
  const key = err.messageKey || "errors.UNKNOWN_ERROR";

  res.status(status).json({
    success: false,
    message: t(lang, key),
  });
};