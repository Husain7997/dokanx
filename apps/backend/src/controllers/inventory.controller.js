const inventory = require("@/inventory");
const { withLock } = require("@/core/infrastructure");
  const t = require('@/core/language').t;
const Inventory = require("../models/Inventory.model");
exports.adjustStock = async (req, res) => {

  const { product, quantity, note } = req.body;

  const ledger = await inventory.createInventoryEntry({
    shopId: req.shop._id,
    product,
    type: "MANUAL_ADJUST",
    quantity: Math.abs(quantity),
    direction: quantity > 0 ? "IN" : "OUT",
    userId: req.user._id,
    note,
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
  const rows = await Inventory.find({ shopId }).lean();
  res.json({ data: rows });
};

exports.inventoryAlerts = async (req, res) => {
  const shopId = req.shop?._id;
  if (!shopId) return res.status(400).json({ message: "Shop missing" });
  const rows = await Inventory.find({ shopId, stock: { $lte: 5 } }).lean();
  res.json({ data: rows });
};
