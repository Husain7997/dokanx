function requireNonEmpty(field, value, errors) {
  if (!String(value || "").trim()) errors.push(`${field} is required`);
}

function requirePositive(field, value, errors) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.push(`${field} must be greater than 0`);
  }
}

function validateSettlementCreateBody(body = {}) {
  const errors = [];
  requireNonEmpty("shopId", body.shopId, errors);
  requirePositive("totalAmount", body.totalAmount, errors);
  return { valid: errors.length === 0, errors };
}

function validateSettlementProcessBody(body = {}) {
  const errors = [];
  requireNonEmpty("settlementId", body.settlementId, errors);
  return { valid: errors.length === 0, errors };
}

function validateSettlementIdParam(params = {}) {
  const errors = [];
  requireNonEmpty("settlementId", params.settlementId, errors);
  return { valid: errors.length === 0, errors };
}

function validateWalletTopupBody(body = {}) {
  const errors = [];
  requirePositive("amount", body.amount, errors);
  return { valid: errors.length === 0, errors };
}

function validateWalletTransferBody(body = {}) {
  const errors = [];
  requireNonEmpty("toShopId", body.toShopId, errors);
  requirePositive("amount", body.amount, errors);
  return { valid: errors.length === 0, errors };
}

function validateInventoryAdjustBody(body = {}) {
  const errors = [];
  requireNonEmpty("product", body.product, errors);
  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity === 0) {
    errors.push("quantity must be a non-zero number");
  }
  return { valid: errors.length === 0, errors };
}

function validateCreateShopBody(body = {}) {
  const errors = [];
  requireNonEmpty("name", body.name, errors);
  return { valid: errors.length === 0, errors };
}

function validateShopStatusBody(body = {}) {
  const errors = [];
  const status = String(body.status || "").trim().toUpperCase();
  if (!["PLACED", "PAYMENT_PENDING", "PAYMENT_FAILED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(status)) {
    errors.push("status is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validateShopAndUserParams(params = {}) {
  const errors = [];
  requireNonEmpty("shopId", params.shopId, errors);
  requireNonEmpty("userId", params.userId, errors);
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateSettlementCreateBody,
  validateSettlementProcessBody,
  validateSettlementIdParam,
  validateWalletTopupBody,
  validateWalletTransferBody,
  validateInventoryAdjustBody,
  validateCreateShopBody,
  validateShopStatusBody,
  validateShopAndUserParams,
};
