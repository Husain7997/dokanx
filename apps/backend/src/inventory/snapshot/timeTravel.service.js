const Snapshot =
  require("./inventorySnapshot.model");

const InventoryLedger =
  require("../../models/inventoryLedger.model");

async function inventoryAt(productId, date) {

  const snapshot = await Snapshot
    .findOne({
      product: productId,
      createdAt: { $lte: date },
    })
    .sort({ createdAt: -1 });

  if (!snapshot)
    return { available: 0, reserved: 0 };

  let available = snapshot.available;
  let reserved = snapshot.reserved;

  const ledgers =
    await InventoryLedger.find({
      product: productId,
      createdAt: {
        $gt: snapshot.createdAt,
        $lte: date,
      },
    });

  for (const e of ledgers) {
    if (e.type === "RESERVE") {
      available -= e.quantity;
      reserved += e.quantity;
    }
  }

  return { available, reserved };
}

module.exports = { inventoryAt };