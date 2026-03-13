const { logger } = require("@/core/infrastructure");

module.exports.observe = async function observe(event) {
  if (process.env.VERBOSE_SYSTEM_LOGS === "true") {
    logger.debug({ type: event?.type }, "Event trace");
  }
};
