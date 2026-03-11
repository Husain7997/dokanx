function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function requirePositiveOrZero(field, value, errors, max = null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    errors.push(`${field} must be >= 0`);
    return;
  }
  if (max !== null && parsed > max) {
    errors.push(`${field} must be <= ${max}`);
  }
}

function validatePlanBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  if (body.monthlyFee !== undefined) requirePositiveOrZero("monthlyFee", body.monthlyFee, errors);
  if (body.price !== undefined) requirePositiveOrZero("price", body.price, errors);
  if (body.commissionRate !== undefined) requirePositiveOrZero("commissionRate", body.commissionRate, errors, 100);
  if (body.smsQuota !== undefined) requirePositiveOrZero("smsQuota", body.smsQuota, errors);
  return { valid: errors.length === 0, errors };
}

function validateSubscriptionAssignBody(body = {}) {
  const errors = [];
  if (!String(body.tenantId || "").trim()) errors.push("tenantId is required");
  if (!String(body.planId || "").trim()) errors.push("planId is required");
  if (body.overrides?.commissionRate !== undefined) {
    requirePositiveOrZero("overrides.commissionRate", body.overrides.commissionRate, errors, 100);
  }
  return { valid: errors.length === 0, errors };
}

function validateCommissionRuleBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  requirePositiveOrZero("rate", body.rate, errors, 100);
  if (body.orderChannel && !["ONLINE", "POS", "ALL"].includes(asUpper(body.orderChannel))) {
    errors.push("orderChannel is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validateRoutingRuleBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  if (!["MERCHANT_DIRECT", "PLATFORM_WALLET"].includes(asUpper(body.destination))) {
    errors.push("destination is invalid");
  }
  if (body.condition?.orderChannel && !["ONLINE", "POS", "ALL"].includes(asUpper(body.condition.orderChannel))) {
    errors.push("condition.orderChannel is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validateSmsPackBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  const credits = Number(body.credits);
  if (!Number.isFinite(credits) || credits < 1) errors.push("credits must be >= 1");
  requirePositiveOrZero("price", body.price, errors);
  return { valid: errors.length === 0, errors };
}

function validateIdParam(params = {}) {
  const id = String(params.id || params.planId || params.subscriptionId || params.ruleId || params.packId || "").trim();
  return { valid: Boolean(id), errors: id ? [] : ["id is required"] };
}

function validatePreviewCommissionBody(body = {}) {
  const errors = [];
  if (!String(body.tenantId || "").trim()) errors.push("tenantId is required");
  requirePositiveOrZero("orderAmount", body.orderAmount, errors);
  if (body.orderChannel && !["ONLINE", "POS", "ALL"].includes(asUpper(body.orderChannel))) {
    errors.push("orderChannel is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validatePreviewPaymentRoutingBody(body = {}) {
  const errors = [];
  if (!String(body.tenantId || "").trim()) errors.push("tenantId is required");
  requirePositiveOrZero("amount", body.amount, errors);
  if (body.orderChannel && !["ONLINE", "POS", "ALL"].includes(asUpper(body.orderChannel))) {
    errors.push("orderChannel is invalid");
  }
  if (body.paymentMethod !== undefined && !String(body.paymentMethod || "").trim()) {
    errors.push("paymentMethod is required");
  }
  if (body.hasOwnGateway !== undefined && typeof body.hasOwnGateway !== "boolean") {
    errors.push("hasOwnGateway must be boolean");
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validatePlanBody,
  validateSubscriptionAssignBody,
  validateCommissionRuleBody,
  validateRoutingRuleBody,
  validateSmsPackBody,
  validateIdParam,
  validatePreviewCommissionBody,
  validatePreviewPaymentRoutingBody,
};
