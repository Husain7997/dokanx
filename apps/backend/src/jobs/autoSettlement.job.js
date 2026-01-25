
if (process.env.NODE_ENV === "test") {
  module.exports = {};
  return;
}
const cron = require("node-cron");
const Shop = require("../models/shop.model");
const { runAutoSettlement  } = require("../services/autoSettlement.service");

exports.startAutoSettlementCron = () => {
  // Every day at 2 AM
  cron.schedule("0 2 * * *", async () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);

    const shops = await Shop.find({ isActive: true });
// pseudo
const existing = await SettlementRun.findOne({
  periodKey,
  status: "COMPLETED"
});

if (existing) {
  return existing;   // NOT null
}

    for (const shop of shops) {
      try {
        await runAutoSettlement ({
          shopId: shop._id,
          from: yesterday,
          to: end
        });
      } catch (err) {
        console.error("Auto settlement failed for shop", shop._id, err);
      }
    }
  });
};
