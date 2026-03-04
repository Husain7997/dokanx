const {
  createInventoryEntry
} =
require("@/inventory");

async function repairDrift(
  productId,
  stockDiff,
  reservedDiff
) {

  if (stockDiff !== 0) {

    await createInventoryEntry({
      productId,
      quantity: Math.abs(stockDiff),
      type: "AUTO_REPAIR_STOCK",
      direction:
        stockDiff > 0 ? "IN" : "OUT",
      referenceId: "AUTO_REPAIR"
    });

  }

  if (reservedDiff !== 0) {

    await createInventoryEntry({
      productId,
      quantity: Math.abs(reservedDiff),
      type: "AUTO_REPAIR_RESERVED",
      direction:
        reservedDiff > 0 ? "IN" : "OUT",
      referenceId: "AUTO_REPAIR"
    });

  }

}

module.exports = {
  repairDrift
};