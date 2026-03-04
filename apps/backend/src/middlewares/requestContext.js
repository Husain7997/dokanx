const { AsyncLocalStorage } = require("async_hooks");
const { randomUUID } = require("crypto");

const storage = new AsyncLocalStorage();

function requestContext(req, res, next) {
  const context = {
    requestId: randomUUID(),
    startTime: Date.now(),
  };

  storage.run(context, () => next());
}

function getRequestContext() {
  return storage.getStore();
}

module.exports = requestContext;
module.exports.getRequestContext = getRequestContext;