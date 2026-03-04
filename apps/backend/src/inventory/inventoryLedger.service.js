const Product = require("../models/product.model");
const inventory = require("@/inventory");
const { withTransaction } =
  require("@/core/transaction/transaction.context");

  const { publishEvent } =
require("@/infrastructure/events/event.dispatcher");

async function createInventoryEntry({
  productId,
  shopId,
  quantity,
  type,
  direction,
  referenceId,
  meta = {},
}) {
  return withTransaction(async session => {

    const product = await Product.findById(productId)
      .session(session);

    if (!product)
      throw new Error("Product not found");

    const delta =
      direction === "IN"
        ? quantity
        : -quantity;

    const newStock =
      product.stock + delta;

    if (newStock < 0)
      throw new Error("Stock underflow");

    await inventory.createInventoryEntry([{
      productId,
      shopId,
      quantity,
      type,
      direction,
      referenceId,
      meta,
      createdAt: new Date()
    }], { session });
await publishEvent(
  "INVENTORY_MUTATION",
  {
    productId,
    shopId,
    quantity,
    direction,
    type,
    referenceId
  }
);
    product.stock = newStock;
    await product.save({ session });

    return {
      productId,
      stock: newStock
    };
  });
}


/**
 * REAL STOCK FROM LEDGER
 */



module.exports = {
  createInventoryEntry,
};