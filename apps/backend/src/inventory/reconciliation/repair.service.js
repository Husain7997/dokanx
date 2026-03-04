const inventory = require("@/inventory");

/**
 * REPAIR INVENTORY VIA LEDGER REPLAY
 * NEVER MUTATE PRODUCT DIRECTLY
 */

async function repairInventory(
  productId,
  replayed,
  session
) {

  const diffAvailable =
    replayed.availableDiff || 0;

  const diffReserved =
    replayed.reservedDiff || 0;

  if (diffAvailable !== 0) {
    await inventory.createInventoryEntry({
      productId,
      quantity: Math.abs(diffAvailable),
      type: "REPAIR_AVAILABLE",
      direction:
        diffAvailable > 0 ? "IN" : "OUT",
      referenceId: "RECONCILIATION",
      session
    });
  }

  if (diffReserved !== 0) {
    await inventory.createInventoryEntry({
      productId,
      quantity: Math.abs(diffReserved),
      type: "REPAIR_RESERVED",
      direction:
        diffReserved > 0 ? "IN" : "OUT",
      referenceId: "RECONCILIATION",
      session
    });
  }

}

module.exports = { repairInventory };