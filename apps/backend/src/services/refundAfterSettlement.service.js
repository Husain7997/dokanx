const ShopWallet = require("../models/ShopWallet");

async function processRefundAfterSettlement(shopId, amount) {
  if (!shopId) throw new Error("shopId is required");
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid amount");
  }

  const wallet = await ShopWallet.findOneAndUpdate(
    { shop: shopId },
    { $inc: { balance: amount } },
    { upsert: true, new: true }
  );

  return wallet;
}

module.exports = { processRefundAfterSettlement };
