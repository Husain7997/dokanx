const Product =
  require("@/models/product.model");

const {
  detectDrift
} =
require("./drift.detector");

const {
  repairDrift
} =
require("./auto.repair");

async function runInventoryReconciliation() {

  const products =
    await Product.find().limit(50);

  for (const product of products) {

    const drift =
      await detectDrift(product._id);

    if (drift?.hasDrift) {

      console.warn(
        "⚠ Inventory Drift Detected:",
        product._id
      );

      await repairDrift(
        product._id,
        drift.stockDiff,
        drift.reservedDiff
      );

    }

  }

}

module.exports = {
  runInventoryReconciliation
};