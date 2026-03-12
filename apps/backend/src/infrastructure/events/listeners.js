// src/infrastructure/events/listeners.js

const { eventBus, logger } = require("@/core/infrastructure");
const { registerAutomationEventListeners } = require("@/modules/automation/automationEvents.listener");
const appWebhookDelivery = require("@/modules/app-marketplace/webhookDelivery.service");

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

  ["ORDER_CREATED", "ORDER_DELIVERED", "PAYMENT_RECEIVED", "SETTLEMENT_COMPLETED", "POS_SYNC_COMPLETED", "LOW_STOCK_ALERT"].forEach(eventName => {
    eventBus.on(eventName, async payload => {
      try {
        await appWebhookDelivery.deliverEvent({ eventName, payload });
      } catch (err) {
        logger.warn({ err: err.message, eventName }, "App webhook delivery enqueue failed");
      }
    });
  });

  registerAutomationEventListeners();

  // Add more domain listeners here

  logger.info("Event listeners registered");
}

registerEventListeners();

module.exports = {};
