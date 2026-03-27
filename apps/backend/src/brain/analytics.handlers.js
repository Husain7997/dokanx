const Suggestion = require("../models/suggestion.model");
const {
  calcStockVelocity,
  calcRevenueTrend,
  calcRefundRate,
  detectOrderSpike,
} = require("./signal.calculators");

async function collectSignalsForShop({ shopId }) {
  return {
    stockVelocity: await calcStockVelocity(shopId),
    revenueTrend: await calcRevenueTrend(shopId),
    refundRate: await calcRefundRate(shopId),
    orderSpike: await detectOrderSpike(shopId),
  };
}

function predictInventoryRiskFromSignals(signals = {}) {
  if (Number(signals.stockVelocity || 0) > 20 && Number(signals.remainingStock || 0) < 5) {
    return "OUT_OF_STOCK_SOON";
  }
  if (Number(signals.orderSpike || 0) >= 2) {
    return "DEMAND_SPIKE";
  }
  return "HEALTHY";
}

async function executeAnalyticsAction(action = {}) {
  const normalizedAction = action.type || action.action || "ANALYTICS_ACTION";
  return Suggestion.create({
    action: normalizedAction,
    shopId: action.shopId || null,
    productId: action.productId || null,
    payload: action.payload || action.data || action,
    source: "analytics-queue",
  });
}

module.exports = {
  collectSignalsForShop,
  predictInventoryRiskFromSignals,
  executeAnalyticsAction,
};
