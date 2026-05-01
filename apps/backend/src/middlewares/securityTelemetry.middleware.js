const { recordSuspiciousResponse } = require("../services/securityResponse.service");

module.exports = function securityTelemetry(req, res, next) {
  const originalEnd = res.end.bind(res);
  let handled = false;

  res.end = function patchedEnd(...args) {
    if (handled) {
      return originalEnd(...args);
    }

    handled = true;

    Promise.resolve(recordSuspiciousResponse(req, res))
      .catch(() => null)
      .finally(() => {
        originalEnd(...args);
      });
  };

  next();
};
