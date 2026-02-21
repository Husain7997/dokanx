const Inventory = require("../models/Inventory.model");
const InventoryTransaction = require("../models/inventoryTransaction.model");
const {
  createInventoryEntry,
} = require("./inventoryLedger.service");
/**
 * Reserve stock when order is CONFIRMED
 */
async function reserveStock({ shopId, productId, quantity, orderId }) {
  const inventory = await Inventory.findOne({ shop: shopId, product: productId });

  if (!inventory) throw new Error("Inventory not found");

  if (inventory.stock - inventory.reserved < quantity) {
    throw new Error("Insufficient stock");
  }
console.log('RESERVE STOCK CALLED', orderId);
  inventory.stock -= quantity;
  inventory.reserved += quantity;
  await inventory.save();

  await InventoryTransaction.create({
    shop: shopId,
    product: productId,
    type: "RESERVE",
    quantity,
    order: orderId,
  });

  return inventory;
}

/**
 * Release reserved stock (order cancelled / expired)
 */
exports.releaseStock = async ({ productId, quantity, shopId }) => {
  const inventory = await Inventory.findOne({
    product: productId,
    shop: shopId
  });

  if (!inventory) {
    throw new Error("Inventory not found");
  }

  if (inventory.reserved < quantity) {
    throw new Error("Invalid release quantity");
  }

  inventory.stock += quantity;
  inventory.reserved -= quantity;

  await inventory.save();
  return inventory;
};

// 🔍 GET inventory by product + shop
const getInventoryByProduct = async ({ shopId, productId }) => {
  return Inventory.findOne({
    shop: shopId,
    product: productId
  });
};

/**
 * Deduct final stock (order DELIVERED)
 */
const deductStockOnDelivery = async (order) => {
  for (const item of order.items) {
    const inventory =  await createInventoryEntry({
      shop: order.shop,
      product: item.product,
      type: "SALE",
      quantity: item.quantity,
      direction: "OUT",
      referenceId: order._id,
      referenceModel: "Order",
      userId: order.user,
    });

    if (!inventory) {
      throw new Error("Inventory not found");
    }

    if (inventory.stock < item.quantity) {
      throw new Error("Insufficient stock");
    }

    inventory.stock -= item.quantity;
    await inventory.save();

    await InventoryTransaction.create({
      shop: order.shop,
      product: item.product,
      type: "OUT",
      quantity: item.quantity,
      note: "Order delivered"
    });
  }
};

const rollbackStockOnRefund = async (order) => {
  for (const item of order.items) {
    const inventory = await createInventoryEntry({
      shop: order.shop,
      product: item.product,
      type: "RETURN",
      quantity: item.quantity,
      direction: "IN",
      referenceId: order._id,
      referenceModel: "Order",
      userId: order.user,
    });

    if (!inventory) {
      throw new Error("Inventory not found for rollback");
    }

    inventory.stock += item.quantity;
    await inventory.save();

    await InventoryTransaction.create({
      shop: order.shop,
      product: item.product,
      type: "IN",
      quantity: item.quantity,
      note: "Order refunded"
    });
  }
};




module.exports = {
  reserveStock,
   rollbackStockOnRefund,

deductStockOnDelivery,

  getInventoryByProduct,
};
