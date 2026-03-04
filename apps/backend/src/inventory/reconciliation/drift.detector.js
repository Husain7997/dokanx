const Product =
  require("@/models/product.model");

const {
  replayProduct
} =
require("./replay.engine");

async function detectDrift(productId) {

  const product =
    await Product.findById(productId);

  if (!product) return null;

  const replayed =
    await replayProduct(productId);

  const stockDiff =
    replayed.stock - product.stock;

  const reservedDiff =
    replayed.reserved - product.reserved;

  const hasDrift =
    stockDiff !== 0 ||
    reservedDiff !== 0;

  return {
    hasDrift,
    stockDiff,
    reservedDiff,
    product,
    replayed
  };
}

module.exports = {
  detectDrift
};