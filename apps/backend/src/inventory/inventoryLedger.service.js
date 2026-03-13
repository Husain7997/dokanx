const Product = require("../models/product.model");
const InventoryLedger = require("../models/inventoryLedger.model");
const { withTransaction } =
  require("@/core/transaction/transaction.context");
const { eventBus, publishEvent } = require("@/core/infrastructure");

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

    const resolvedShopId = shopId || product.shopId;
    if (!resolvedShopId)
      throw new Error("Shop context missing");

    const delta =
      direction === "IN"
        ? quantity
        : -quantity;

    const newStock =
      product.stock + delta;

    if (newStock < 0)
      throw new Error("Stock underflow");

    await InventoryLedger.create(
      [
        {
          product: productId,
          shopId: resolvedShopId,
          quantity,
          type,
          direction,
          referenceId,
          referenceModel: meta.referenceModel || "Order",
          createdBy: meta.userId || null
        }
      ],
      { session }
    );

    await publishEvent("INVENTORY_MUTATION", {
      productId,
      shopId: resolvedShopId,
      quantity,
      direction,
      type,
      referenceId
    });

    product.stock = newStock;
    eventBus.emit("inventory.updated", { productId, shopId, stock: newStock });
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
