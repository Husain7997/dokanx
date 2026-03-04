const Snapshot = require("./inventorySnapshot.model");
const InventoryLedger = require("../../models/inventoryLedger.model");

async function createSnapshot(productId) {

  const lastSnapshot = await Snapshot
    .findOne({ product: productId })
    .sort({ createdAt: -1 });

  const query = { product: productId };

  if (lastSnapshot)
    query._id = { $gt: lastSnapshot.lastLedgerId };

  const entries = await InventoryLedger
    .find(query)
    .sort({ createdAt: 1 });

  let available = lastSnapshot?.available || 0;
  let reserved = lastSnapshot?.reserved || 0;

  for (const e of entries) {
    if (e.type === "STOCK_IN") available += e.quantity;
    if (e.type === "RESERVE") {
      available -= e.quantity;
      reserved += e.quantity;
    }
  }

  await Snapshot.create({
    product: productId,
    available,
    reserved,
    lastLedgerId: entries.at(-1)?._id,
  });
}