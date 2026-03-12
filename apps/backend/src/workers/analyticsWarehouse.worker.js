const { logger } = require("@/core/infrastructure");
const warehouseService = require("@/modules/analytics-warehouse/analyticsWarehouse.service");

async function runAnalyticsWarehouseJob(payload = {}) {
  try {
    return await warehouseService.buildWarehouseSnapshots(payload);
  } catch (err) {
    logger.error({ err: err.message }, "analytics warehouse worker failed");
    throw err;
  }
}

module.exports = {
  runAnalyticsWarehouseJob,
};
