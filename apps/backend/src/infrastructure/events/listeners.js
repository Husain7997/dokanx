// src/infrastructure/events/listeners.js

const { eventBus, logger } = require("@/core/infrastructure");

/**
 * GLOBAL EVENT LISTENERS
 * All domain events are registered here
 */

function registerEventListeners() {

  eventBus.on("LEDGER_TRANSACTION_COMPLETED", (payload) => {
    logger.info({
      event: "LEDGER_TRANSACTION_COMPLETED",
      payload
    });
  });

  // Add more domain listeners here

  logger.info("Event listeners registered");
}

registerEventListeners();

module.exports = {};