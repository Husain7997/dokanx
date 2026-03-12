const ORDER_STATUSES = Object.freeze([
  "PLACED",
  "PENDING",
  "PAYMENT_PENDING",
  "PAYMENT_FAILED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
  "REFUNDED",
]);

const ORDER_STATUS_TRANSITIONS = Object.freeze({
  PLACED: ["PENDING", "PAYMENT_PENDING", "CONFIRMED", "CANCELLED"],
  PENDING: ["PAYMENT_PENDING", "CONFIRMED", "CANCELLED"],
  PAYMENT_PENDING: ["CONFIRMED", "PAYMENT_FAILED", "CANCELLED"],
  PAYMENT_FAILED: ["PAYMENT_PENDING", "CANCELLED"],
  CONFIRMED: ["PACKED", "SHIPPED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED", "REFUNDED"],
  RETURNED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
});

function normalizeOrderStatus(status = "") {
  return String(status || "").trim().toUpperCase();
}

function isValidOrderStatus(status = "") {
  return ORDER_STATUSES.includes(normalizeOrderStatus(status));
}

function getAllowedOrderTransitions(status = "") {
  return ORDER_STATUS_TRANSITIONS[normalizeOrderStatus(status)] || [];
}

function canTransitionOrderStatus(from, to) {
  return getAllowedOrderTransitions(from).includes(normalizeOrderStatus(to));
}

module.exports = {
  ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  normalizeOrderStatus,
  isValidOrderStatus,
  getAllowedOrderTransitions,
  canTransitionOrderStatus,
};
