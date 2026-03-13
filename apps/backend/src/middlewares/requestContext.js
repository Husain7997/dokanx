const { AsyncLocalStorage } = require("async_hooks");
const { randomUUID } = require("crypto");

const storage = new AsyncLocalStorage();

function requestContext(req, res, next) {
  const incoming =
    String(req.headers["x-request-id"] || req.headers["x-correlation-id"] || "").trim();
  const requestId = incoming || randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const context = {
    requestId,
    startTime: Date.now(),
  };

  storage.run(context, () => next());
}

function getRequestContext() {
  return storage.getStore();
}

module.exports = requestContext;
module.exports.getRequestContext = getRequestContext;
