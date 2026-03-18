const cron = require("node-cron");

const Shop = require("../models/shop.model");
const { buildWarehouseSnapshots } = require("../analytics/analyticsWarehouse.service");

function startAnalyticsWarehouseCron() {
  if (process.env.ANALYTICS_WAREHOUSE_CRON !== "true") {
    return;
  }

  cron.schedule("15 2 * * *", async () => {
    try {
      const shops = await Shop.find({}).select("_id").lean();
      for (const shop of shops) {
        await buildWarehouseSnapshots({ shopId: shop._id });
      }
      await buildWarehouseSnapshots({ shopId: null });
      console.log(`Analytics warehouse snapshots built for ${shops.length} shops.`);
    } catch (error) {
      console.error("Analytics warehouse cron failed:", error);
    }
  });
}

module.exports = { startAnalyticsWarehouseCron };
