const inventory = require("@/inventory");
const { withLock, logger } = require("@/core/infrastructure");
  const t = require('@/core/language').t;
exports.adjustStock = async (req, res) => {

  const { product, quantity, note } = req.body;

  const ledger = await inventory.createInventoryEntry({
    shopId: req.shop._id,
    productId: product,
    type: "MANUAL_ADJUST",
    quantity: Math.abs(quantity),
    direction: quantity > 0 ? "IN" : "OUT",
    meta: {
      userId: req.user._id,
      note,
      referenceModel: "ManualAdjustment"
    }
  });

res.json({
  message: t('common.updated', req.lang),
  ledger
});
};



exports.lockTest = async (req, res) => {

  await withLock("test-lock", async () => {
    logger.info({ lock: "test-lock" }, "Inventory test lock acquired");

    await new Promise(r => setTimeout(r, 5000));
    logger.info({ lock: "test-lock" }, "Inventory test lock released");

  });

  res.json({ message: t('common.updated', req.lang) });
};
