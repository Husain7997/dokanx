const cron = require("node-cron");

const settlementQueue =
require("../queue/settlement.queue");

const Shop = require("../../models/shop.model");

cron.schedule("0 2 * * *", async () => {
  console.log("⏰ Auto Settlement Triggered");

  const shops = await Shop.find(
    { isActive: true },
    "_id"
  );

  for (const shop of shops) {
    await settlementQueue.add(
      "auto-settlement",
      { shopId: shop._id }
    );
  }
});
