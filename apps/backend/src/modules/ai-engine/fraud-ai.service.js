const Order = require("../../models/order.model");
const WarrantyClaim = require("../warranty-engine/warrantyClaim.model");
const cache = require("../../infrastructure/redis/cache.service");
const { guardRiskDecision } = require("./ai-decision.guard");

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function getFraudSignals({ customerId, shopId, order, userOrders = [] }) {
  const ipAddress = order?.metadata?.ipAddress || order?.metadata?.ip || null;
  const deviceId = order?.metadata?.deviceId || null;
  const cacheKey = `ai:fraud:${customerId || "guest"}:${shopId || "none"}:${ipAddress || "noip"}:${deviceId || "nodevice"}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [claims, refunds, shopOrders] = await Promise.all([
    customerId ? WarrantyClaim.find({ customerId }).select("createdAt status").lean() : [],
    customerId ? Order.find({ customerId, status: "REFUNDED" }).select("_id").lean() : [],
    shopId ? Order.find({ shopId }).select("createdAt status deliveryAddress").lean() : [],
  ]);
  const [ipOrders, deviceOrders, linkedAccounts] = await Promise.all([
    ipAddress
      ? Order.find({
          "metadata.ipAddress": ipAddress,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        })
          .select("customerId createdAt")
          .lean()
      : [],
    deviceId
      ? Order.find({
          "metadata.deviceId": deviceId,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        })
          .select("customerId createdAt")
          .lean()
      : [],
    ipAddress || deviceId
      ? Order.distinct("customerId", {
          $or: [
            ...(ipAddress ? [{ "metadata.ipAddress": ipAddress }] : []),
            ...(deviceId ? [{ "metadata.deviceId": deviceId }] : []),
          ],
          customerId: { $ne: null },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        })
      : [],
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
  if (ipOrders.length >= 4) {
    signals.push({ code: "IP_VELOCITY", label: "High order velocity per IP", weight: 14, value: ipOrders.length, threshold: ">=4/day" });
    score += 14;
  }
  if (deviceOrders.length >= 4) {
    signals.push({ code: "DEVICE_VELOCITY", label: "High order velocity per device", weight: 14, value: deviceOrders.length, threshold: ">=4/day" });
    score += 14;
  }
  if (linkedAccounts.length >= 3) {
    signals.push({ code: "CROSS_ACCOUNT_LINK", label: "Cross-account linkage detected", weight: 16, value: linkedAccounts.length, threshold: ">=3 linked accounts" });
    score += 16;
  }
  const nightOrders = userOrders.filter((row) => {
    const hour = new Date(row.createdAt).getHours();
    return hour >= 0 && hour <= 4;
  }).length;
  if (nightOrders >= 3) {
    signals.push({ code: "ABNORMAL_TIME_PATTERN", label: "Abnormal late-night activity", weight: 10, value: nightOrders, threshold: ">=3 between 00:00-04:59" });
    score += 10;
  }

  const result = {
    score: clamp(score),
    signals,
    explanation: signals.map((signal) => `${signal.label} (${signal.value})`),
    safety: guardRiskDecision({ score: clamp(score), signals }),
  };
  await cache.set(cacheKey, result, 120);
  return result;
}

async function getClaimFraudSignals({ customerId, shopId, productId }) {
  const [claimsForCustomer, claimsForProduct, recentShopClaims] = await Promise.all([
    customerId ? WarrantyClaim.countDocuments({ customerId }) : 0,
    productId ? WarrantyClaim.countDocuments({ productId }) : 0,
    shopId
      ? WarrantyClaim.countDocuments({
          shopId,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        })
      : 0,
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
  if (recentShopClaims >= 8) {
    flags.push("weekly_shop_claim_spike");
    score += 8;
  }
  return { score: clamp(score), flags };
}

module.exports = {
  getFraudSignals,
  getClaimFraudSignals,
};
