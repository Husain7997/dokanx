const { eventBus, logger } = require("@/core/infrastructure");
const automationService = require("./automation.service");

const TRIGGER_MAP = {
  ORDER_CREATED: "ORDER_CREATED",
  "order.pending": "ORDER_CREATED",
  "order.confirmed": "ORDER_PAID",
  ORDER_DELIVERED: "ORDER_DELIVERED",
  POS_SYNC_COMPLETED: "POS_SYNC_COMPLETED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  SETTLEMENT_COMPLETED: "SETTLEMENT_COMPLETED",
  LOW_STOCK_ALERT: "LOW_STOCK",
};

let registered = false;

function normalizeContext(payload = {}) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  return {
    ...data,
    shopId: data?.shopId || payload?.shopId || payload?.tenantId || null,
    tenantId: payload?.tenantId || data?.shopId || null,
  };
}

function registerAutomationEventListeners() {
  if (registered) return;
  registered = true;

  Object.entries(TRIGGER_MAP).forEach(([eventName, trigger]) => {
    eventBus.on(eventName, async payload => {
      try {
        const context = normalizeContext(payload);
        if (!context.shopId) return;
        await automationService.executeTrigger({
          shopId: context.shopId,
          trigger,
          context,
        });
      } catch (err) {
        logger.warn({ err: err.message, eventName }, "Automation event execution failed");
      }
    });
  });
}

module.exports = {
  registerAutomationEventListeners,
};
