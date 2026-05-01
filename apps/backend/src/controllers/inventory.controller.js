const inventory = require("@/inventory");
const { withLock } = require("@/core/infrastructure");
  const t = require('@/core/language').t;
const Inventory = require("../models/Inventory.model");
const { createAudit } = require("../utils/audit.util");
exports.adjustStock = async (req, res) => {

  const { product, quantity, note, source } = req.body;

  const ledger = await inventory.createInventoryEntry({
    shopId: req.shop._id,
    product,
    type: "MANUAL_ADJUST",
    quantity: Math.abs(quantity),
    direction: quantity > 0 ? "IN" : "OUT",
    userId: req.user._id,
    note,
  });

  await createAudit({
    action: "INVENTORY_ADJUSTED",
    performedBy: req.user?._id || null,
    targetType: "Inventory",
    targetId: product,
    req,
    meta: {
      quantity: Number(quantity || 0),
      direction: quantity > 0 ? "IN" : "OUT",
      note: note || "",
      source: String(source || "manual_dashboard"),
      ledgerId: ledger?._id ? String(ledger._id) : null,
    },
  });

res.json({
  message: t('common.updated', req.lang),
  ledger
});
};



exports.lockTest = async (req, res) => {

  await withLock("test-lock", async () => {

    console.log("LOCK ACQUIRED");

    await new Promise(r => setTimeout(r, 5000));

    console.log("LOCK RELEASED");

  });

  res.json({ message: t('common.updated', req.lang) });
};

exports.listInventory = async (req, res) => {
  const shopId = req.shop?._id;
  if (!shopId) return res.status(400).json({ message: "Shop missing" });
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 200)
    : null;
  const filter = { shopId };
  const sort = { updatedAt: -1, createdAt: -1 };

  let query = Inventory.find(filter).sort(sort);

  if (limit) {
    query = query.limit(limit);
  }

  const rows = await query.lean();
  res.json({ data: rows });
};

exports.inventoryAlerts = async (req, res) => {
  const shopId = req.shop?._id;
  if (!shopId) return res.status(400).json({ message: "Shop missing" });
  const rows = await Inventory.find({ shopId, stock: { $lte: 5 } }).lean();
  res.json({ data: rows });
};
