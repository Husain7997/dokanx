const InventoryLedger =
  require("@/models/inventoryLedger.model");

/**
 * Replay full ledger for one product
 * Returns calculated state
 */
async function replayProduct(productId) {

  const entries =
    await InventoryLedger
      .find({ productId })
      .sort({ createdAt: 1 });

  let stock = 0;
  let reserved = 0;

  for (const entry of entries) {

    const qty = entry.quantity;

    if (entry.type === "RESERVATION") {
      reserved += qty;
    }

    else if (entry.type === "ORDER_CANCEL") {
      reserved -= qty;
    }

    else {
      stock +=
        entry.direction === "IN"
          ? qty
          : -qty;
    }

  }

  return {
    stock,
    reserved
  };
}

module.exports = {
  replayProduct
};