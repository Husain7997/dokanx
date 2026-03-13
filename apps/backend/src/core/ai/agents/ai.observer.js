// src/core/ai/agents/ai.observer.js

const { eventBus, logger } = require("@/core/infrastructure");

function startAIObserver() {
  const verbose = process.env.VERBOSE_AI_LOGS === "true";
  if (verbose) {
    logger.debug("AI Observer started");
  }

  const originalEmit = eventBus.emit;

  eventBus.emit = function (eventName, ...args) {
    if (verbose) {
      logger.debug({ eventName }, "AI Observed Event");
    }
    return originalEmit.call(this, eventName, ...args);
  };
}

module.exports = { startAIObserver };
