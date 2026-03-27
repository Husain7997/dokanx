const logger = require("../infrastructure/logger/logger");

function asId(value) {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return null;
}

function resolveShopId(order = {}) {
  return asId(order.shopId) || asId(order.shop) || null;
}

function resolveCustomerId(order = {}) {
  return asId(order.customerId) || asId(order.customer) || asId(order.user) || null;
}

function applyNormalizedOrderFields(order, options = {}) {
  if (!order) return order;

  const normalizedShopId = resolveShopId(order);
  const normalizedCustomerId = resolveCustomerId(order);
  const shouldLog = options.logDifferences !== false;
  const differences = [];

  if (!order.shopId && normalizedShopId) {
    order.shopId = normalizedShopId;
    differences.push("shop->shopId");
  }
  if (!order.shop && normalizedShopId) {
    order.shop = normalizedShopId;
  }

  if (!order.customerId && normalizedCustomerId) {
    order.customerId = normalizedCustomerId;
    differences.push(order.customer ? "customer->customerId" : "user->customerId");
  }
  if (!order.customer && normalizedCustomerId) {
    order.customer = normalizedCustomerId;
  }
  if (!order.user && normalizedCustomerId) {
    order.user = normalizedCustomerId;
  }

  if (shouldLog && differences.length) {
    logger.warn(
      {
        orderId: asId(order._id),
        differences,
      },
      "Order normalization applied legacy field mapping"
    );
  }

  return order;
}

module.exports = {
  applyNormalizedOrderFields,
  resolveCustomerId,
  resolveShopId,
};
