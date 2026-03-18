const Order = require("../../models/order.model");
const WarrantyClaim = require("../warranty-engine/warrantyClaim.model");

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function getFraudSignals({ customerId, shopId, order, userOrders = [] }) {
  const [claims, refunds, shopOrders] = await Promise.all([
    customerId ? WarrantyClaim.find({ customerId }).select("createdAt status").lean() : [],
    customerId ? Order.find({ customerId, status: "REFUNDED" }).select("_id").lean() : [],
    shopId ? Order.find({ shopId }).select("createdAt status deliveryAddress").lean() : [],
  ]);

  const signals = [];
  let score = 0;
  if (claims.length >= 3) {
    signals.push({ code: "CLAIM_VELOCITY", label: "Too many claims", weight: 16, value: claims.length, threshold: ">=3" });
    score += 16;
  }
  const refundRatio = userOrders.length ? refunds.length / userOrders.length : 0;
  if (refundRatio >= 0.25 && refunds.length >= 2) {
    signals.push({ code: "REFUND_RATIO", label: "High refund ratio", weight: 18, value: Number(refundRatio.toFixed(2)), threshold: ">=0.25" });
    score += 18;
  }
  const spikeBoundary = Date.now() - 24 * 60 * 60 * 1000;
  const recentOrders = userOrders.filter((row) => new Date(row.createdAt).getTime() >= spikeBoundary).length;
  if (recentOrders >= 5) {
    signals.push({ code: "ORDER_SPIKE", label: "Abnormal order spike", weight: 20, value: recentOrders, threshold: ">=5/day" });
    score += 20;
  }
  const city = order?.deliveryAddress?.city || "";
  const mismatchCount = shopOrders.filter((row) => row.deliveryAddress?.city && row.deliveryAddress.city !== city).length;
  if (city && mismatchCount >= 20 && recentOrders >= 3) {
    signals.push({ code: "LOCATION_PATTERN", label: "Mismatched location pattern", weight: 12, value: city, threshold: "anomalous city mix" });
    score += 12;
  }
  return { score: clamp(score), signals, explanation: signals.map((signal) => `${signal.label} (${signal.value})`) };
}

async function getClaimFraudSignals({ customerId, shopId, productId }) {
  const [claimsForCustomer, claimsForProduct] = await Promise.all([
    customerId ? WarrantyClaim.countDocuments({ customerId }) : 0,
    productId ? WarrantyClaim.countDocuments({ productId }) : 0,
  ]);
  const flags = [];
  let score = 0;
  if (claimsForCustomer >= 3) {
    flags.push("repeat_customer_claims");
    score += 18;
  }
  if (claimsForProduct >= 5) {
    flags.push("high_product_claim_volume");
    score += 14;
  }
  if (shopId && claimsForCustomer >= 2) {
    flags.push("shop_specific_claim_pattern");
    score += 10;
  }
  return { score: clamp(score), flags };
}

module.exports = {
  getFraudSignals,
  getClaimFraudSignals,
};
