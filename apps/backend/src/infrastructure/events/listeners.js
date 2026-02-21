const bus = require("./eventBus");

bus.on("SETTLEMENT_COMPLETED", async (data) => {
  console.log(
    "📊 Settlement completed for:",
    data.shopId
  );
});

bus.on("PAYOUT_COMPLETED", async (data) => {
  console.log(
    "💰 Payout processed:",
    data.payoutId
  );
});
