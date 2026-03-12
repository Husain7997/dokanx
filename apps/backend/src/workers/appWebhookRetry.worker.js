const { logger } = require("@/core/infrastructure");
const webhookDeliveryService = require("@/modules/app-marketplace/webhookDelivery.service");

function startAppWebhookRetryWorker({ intervalMs = 60 * 1000 } = {}) {
  const timer = setInterval(async () => {
    try {
      await webhookDeliveryService.processRetryBatch({ limit: 25 });
    } catch (err) {
      logger.error({ err: err.message }, "App webhook retry worker failed");
    }
  }, intervalMs);

  return {
    close: async () => clearInterval(timer),
  };
}

module.exports = {
  startAppWebhookRetryWorker,
};
