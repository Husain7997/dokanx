const { AsyncLocalStorage } = require("async_hooks");
const { randomUUID } = require("crypto");

const storage = new AsyncLocalStorage();

function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  const correlationId = req.headers["x-correlation-id"] || requestId;
  const context = {
    requestId,
    correlationId,
    startTime: Date.now(),
  };

  req.requestId = requestId;
  req.correlationId = correlationId;
  res.setHeader("x-request-id", requestId);
  res.setHeader("x-correlation-id", correlationId);

  storage.run(context, () => next());
}

function getRequestContext() {
  return storage.getStore();
}

module.exports = requestContext;
module.exports.getRequestContext = getRequestContext;
