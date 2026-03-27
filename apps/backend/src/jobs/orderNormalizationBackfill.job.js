const Order = require("../models/order.model");
const { applyNormalizedOrderFields } = require("../utils/order-normalization.util");

async function runOrderNormalizationBackfill({ limit = 200 } = {}) {
  const orders = await Order.find({
    $or: [
      { shopId: null, shop: { $ne: null } },
      { customerId: null, customer: { $ne: null } },
      { customerId: null, user: { $ne: null } },
    ],
  })
    .limit(limit)
    .sort({ createdAt: 1 });

  let updated = 0;
  for (const order of orders) {
    applyNormalizedOrderFields(order, { logDifferences: true });
    if (order.isModified()) {
      await order.save();
      updated += 1;
    }
  }

  return { scanned: orders.length, updated };
}

async function startOrderNormalizationBackfill() {
  if (process.env.ORDER_NORMALIZATION_BACKFILL !== "true") {
    return;
  }
  await runOrderNormalizationBackfill();
}

module.exports = {
  runOrderNormalizationBackfill,
  startOrderNormalizationBackfill,
};
