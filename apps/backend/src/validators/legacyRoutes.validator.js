function requireNonEmpty(field, value, errors) {
  if (!String(value || "").trim()) errors.push(`${field} is required`);
}

function requirePositive(field, value, errors) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.push(`${field} must be greater than 0`);
  }
}

const { isValidOrderStatus } = require("@/domain/orderStatus");

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
  if (!isValidOrderStatus(status)) {
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

function validateShopSettingsBody(body = {}) {
  const errors = [];

  requireNonEmpty("name", body.name, errors);

  if (body.supportEmail !== undefined) {
    const email = String(body.supportEmail || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("supportEmail must be a valid email");
    }
  }

  if (body.whatsapp !== undefined && !String(body.whatsapp || "").trim()) {
    errors.push("whatsapp must not be empty");
  }

  if (body.payoutSchedule !== undefined && !String(body.payoutSchedule || "").trim()) {
    errors.push("payoutSchedule must not be empty");
  }

  if (body.logoUrl !== undefined && !String(body.logoUrl || "").trim()) {
    errors.push("logoUrl must not be empty");
  }

  if (body.brandPrimaryColor !== undefined && !String(body.brandPrimaryColor || "").trim()) {
    errors.push("brandPrimaryColor must not be empty");
  }

  if (body.brandAccentColor !== undefined && !String(body.brandAccentColor || "").trim()) {
    errors.push("brandAccentColor must not be empty");
  }

  return { valid: errors.length === 0, errors };
}

function validateTeamMemberBody(body = {}) {
  const errors = [];
  requireNonEmpty("name", body.name, errors);
  requireNonEmpty("email", body.email, errors);

  const role = String(body.role || "").trim().toUpperCase();
  if (body.role !== undefined && !["STAFF", "OWNER"].includes(role)) {
    errors.push("role must be STAFF or OWNER");
  }

  if (body.permissions !== undefined && !Array.isArray(body.permissions)) {
    errors.push("permissions must be an array");
  }

  return { valid: errors.length === 0, errors };
}

function validateTeamMemberUpdateBody(body = {}) {
  const errors = [];

  if (body.role === undefined && body.permissions === undefined) {
    errors.push("role or permissions is required");
  }

  if (body.role !== undefined) {
    const role = String(body.role || "").trim().toUpperCase();
    if (!["STAFF", "OWNER"].includes(role)) {
      errors.push("role must be STAFF or OWNER");
    }
  }

  if (body.permissions !== undefined && !Array.isArray(body.permissions)) {
    errors.push("permissions must be an array");
  }

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
  validateShopSettingsBody,
  validateTeamMemberBody,
  validateTeamMemberUpdateBody,
};
