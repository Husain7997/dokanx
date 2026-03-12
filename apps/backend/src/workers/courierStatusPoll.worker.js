const { logger } = require("@/core/infrastructure");
const courierService = require("@/modules/courier/courier.service");

function startCourierStatusPollWorker({ intervalMs = 2 * 60 * 1000 } = {}) {
  const timer = setInterval(async () => {
    try {
      await courierService.pollActiveShipmentStatuses({ limit: 25 });
      await courierService.escalateCourierAnomalies({ limit: 25 });
    } catch (err) {
      logger.error({ err: err.message }, "Courier status poll worker failed");
    }
  }, intervalMs);

  return {
    close: async () => clearInterval(timer),
  };
}

module.exports = {
  startCourierStatusPollWorker,
};
