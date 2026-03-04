const InventoryLedger = require("../../models/inventoryLedger.model");
const Product = require("../../models/product.model");

async function replayProductLedger(productId, session = null) {
  const entries = await InventoryLedger.find({ product: productId })
    .sort({ createdAt: 1 })
    .session(session)
  .readConcern("snapshot");

  let available = 0;
  let reserved = 0;

  for (const e of entries) {
    switch (e.type) {
      case "STOCK_IN":
        available += e.quantity;
        break;

      case "RESERVE":
        available -= e.quantity;
        reserved += e.quantity;
        break;

      case "CONFIRM":
        reserved -= e.quantity;
        break;

      case "RELEASE":
        reserved -= e.quantity;
        available += e.quantity;
        break;

      case "ADJUST":
        available += e.quantity;
        break;
    }
  }

  return { available, reserved };
}

module.exports = {
  replayProductLedger,
};