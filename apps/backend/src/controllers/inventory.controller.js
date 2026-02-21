const {
  createInventoryEntry,
} = require("../services/inventoryLedger.service");

exports.adjustStock = async (req, res) => {

  const { product, quantity, note } = req.body;

  const ledger = await createInventoryEntry({
    shop: req.shop._id,
    product,
    type: "ADJUSTMENT",
    quantity: Math.abs(quantity),
    direction: quantity > 0 ? "IN" : "OUT",
    userId: req.user._id,
    note,
  });

  res.json({
    success: true,
    ledger,
  });
};