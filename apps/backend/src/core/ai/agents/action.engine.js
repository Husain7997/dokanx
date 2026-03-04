const Shop =
  require("@/models/shop.model");

const eventBus = require("@/infrastructure/events/eventBus");

exports.act = async ({ risk, event }) => {

  const shopId =
    event.payload?.shopId;

  if (!shopId) return;

  console.log("🚨 AI taking action");

  await Shop.updateOne(
    { _id: shopId },
    { riskScore: risk.score }
  );

  if (risk.score > 90) {

    await Shop.updateOne(
      { _id: shopId },
      { status: "SUSPENDED" }
    );

    eventBus.emit(
      "SHOP_SUSPENDED",
      { shopId }
    );
  }
};