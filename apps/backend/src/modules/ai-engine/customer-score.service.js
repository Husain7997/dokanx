const CreditSale = require("../credit-engine/creditSale.model");
const Order = require("../../models/order.model");
const { getCustomerSnapshot } = require("./feature-store/feature-store.service");

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function scoreCustomer(customerId) {
  const [snapshot, creditSales] = await Promise.all([
    getCustomerSnapshot(customerId),
    CreditSale.find({ customerId }).select("status outstandingAmount amount").lean(),
  ]);

  const features = snapshot?.features || {};
  const frequencyScore = Math.min(35, Number(features.totalOrders || 0) * 3);
  const reliabilityScore = Math.round(Number(features.paymentReliability || 0) * 30);
  const creditUsageRatio =
    creditSales.reduce((sum, sale) => sum + Number(sale.outstandingAmount || 0), 0) /
    Math.max(creditSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0), 1);
  const creditUsagePenalty = Math.min(25, Math.round(creditUsageRatio * 25));
  const score = clamp(35 + frequencyScore + reliabilityScore - creditUsagePenalty);

  return {
    score,
    decision: score >= 70 ? "approve" : score >= 45 ? "review" : "restrict",
    reasons: [
      `purchase_frequency=${Number(features.totalOrders || 0)}`,
      `payment_reliability=${Number(features.paymentReliability || 0)}`,
      `credit_usage_ratio=${Number(creditUsageRatio.toFixed(4))}`,
    ],
  };
}

async function getOfferTargetCustomers({ limit = 10 } = {}) {
  const rows = await Order.aggregate([
    { $match: { status: { $nin: ["CANCELLED", "REFUNDED"] }, customerId: { $ne: null } } },
    { $group: { _id: "$customerId", orderCount: { $sum: 1 }, totalSpent: { $sum: "$totalAmount" } } },
    { $sort: { totalSpent: -1, orderCount: -1 } },
    { $limit: limit },
  ]);

  const scored = [];
  for (const row of rows) {
    const result = await scoreCustomer(row._id);
    scored.push({
      customerId: row._id,
      orderCount: row.orderCount,
      totalSpent: row.totalSpent,
      customerScore: result.score,
      decision: result.decision,
    });
  }
  return scored;
}

module.exports = {
  scoreCustomer,
  getOfferTargetCustomers,
};
