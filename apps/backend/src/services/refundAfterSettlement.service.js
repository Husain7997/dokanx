const ShopWallet = require("../models/ShopWallet");

async function processRefundAfterSettlement(shopId, amount) {
  if (!shopId) throw new Error("shopId is required");
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid amount");
  }

  const wallet = await ShopWallet.findOneAndUpdate(
    { shopId: shopId },
    { $inc: { balance: amount } },
    { upsert: true, returnDocument: "after" }
  );

  return wallet;
}

module.exports = { processRefundAfterSettlement };
