const { getRequestContext } = require("../middlewares/requestContext");

function formatLog(level, message, meta = {}) {
  const context = getRequestContext();

  return JSON.stringify({
    level,
    message,
    requestId: context?.requestId,
    time: new Date().toISOString(),
    ...meta,
  });
}

module.exports = {
  info: (msg, meta) => console.log(formatLog("INFO", msg, meta)),
  error: (msg, meta) => console.error(formatLog("ERROR", msg, meta)),
};