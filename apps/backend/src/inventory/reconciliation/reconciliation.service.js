const mongoose = require("mongoose");
const Product = require("../../models/product.model");

const { replayProductLedger } = require("./ledgerReplay.service");
const { detectCorruption } = require("./corruptionDetector");
const { repairInventory } = require("./repair.service");

async function reconcileProduct(product) {
  const session = await mongoose.startSession();

  await session.withTransaction(async () => {
    const replayed = await replayProductLedger(product._id, session);

    const issues = detectCorruption(product, replayed);

    if (!issues.length) return;

    console.warn(
      `Inventory corruption detected for ${product._id}`,
      issues
    );

    await repairInventory(product._id, replayed, session);
  });

  session.endSession();
}

async function reconcileShopInventory(shopId) {
  const products = await Product.find({ shopId: shopId });

  for (const p of products) {
    await reconcileProduct(p);
  }
}

module.exports = {
  reconcileShopInventory,
};