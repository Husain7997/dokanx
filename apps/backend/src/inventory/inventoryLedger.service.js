const Product = require("../models/product.model");
const InventoryLedger = require("../models/inventoryLedger.model");
const { withTransaction } =
  require("@/core/transaction/transaction.context");

const { publishEvent } =
  require("@/infrastructure/events/event.dispatcher");

function normalizeLedgerType(type) {
  const value = String(type || "").toUpperCase();
  if (value === "RESERVATION") return "ORDER_RESERVE";
  if (value === "COMMIT") return "ORDER_COMMIT";
  if (value === "CANCEL") return "ORDER_CANCEL";
  if (value === "AUTO_REPAIR_STOCK") return "MANUAL_ADJUST";
  if (value === "AUTO_REPAIR_RESERVED") return "MANUAL_ADJUST";
  return value || "MANUAL_ADJUST";
}

async function createInventoryEntry({
  items,
  productId,
  shopId,
  quantity,
  type,
  direction,
  referenceId,
  meta = {},
  session = null,
}) {
  const execute = async (activeSession) => {
    if (Array.isArray(items) && items.length) {
      const results = [];
      for (const item of items) {
        results.push(
          await createInventoryEntry({
            productId: item.product || item.productId,
            shopId,
            quantity: item.quantity,
            type,
            direction,
            referenceId,
            meta: {
              ...meta,
              unitPrice: item.price,
            },
            session: activeSession,
          })
        );
      }
      return results;
    }

    const product = await Product.findById(productId).session(activeSession);

    if (!product) {
      throw new Error("Product not found");
    }

    const delta = direction === "IN" ? quantity : -quantity;
    const newStock = product.stock + delta;

    if (newStock < 0) {
      throw new Error("Stock underflow");
    }

    const resolvedShopId = shopId || product.shopId;
    const normalizedType = normalizeLedgerType(type);
    const idempotencyKey = `${referenceId || "inventory"}:${productId}:${direction}:${normalizedType}`;

    const existingEntry = await InventoryLedger.findOne({ idempotencyKey }).session(activeSession);
    if (existingEntry) {
      return {
        productId,
        shopId: resolvedShopId,
        stock: product.stock,
        duplicate: true,
      };
    }

    await InventoryLedger.create(
      [{
        product: productId,
        shopId: resolvedShopId,
        quantity,
        type: normalizedType,
        direction,
        referenceId,
        referenceModel: meta?.orderId ? "Order" : undefined,
        idempotencyKey,
        createdAt: new Date(),
      }],
      { session: activeSession }
    );

    await publishEvent("INVENTORY_MUTATION", {
      productId,
      shopId: resolvedShopId,
      quantity,
      direction,
      type,
      referenceId,
    });

    product.stock = newStock;
    await product.save({ session: activeSession });

    const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 5);
    if (newStock <= threshold) {
      await publishEvent("inventory.low_stock", {
        productId,
        shopId: resolvedShopId,
        stock: newStock,
        threshold,
      });
    }

    return {
      productId,
      shopId: resolvedShopId,
      stock: newStock,
    };
  };

  if (session) {
    return execute(session);
  }

  return withTransaction(execute);
}

module.exports = {
  createInventoryEntry,
};
