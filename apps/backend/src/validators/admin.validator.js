function requireNonEmpty(field, value, errors) {
  if (!String(value || "").trim()) errors.push(`${field} is required`);
}

function requirePositiveInt(field, value, errors, { min = 1, max = null } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || !Number.isInteger(parsed)) {
    errors.push(`${field} must be an integer >= ${min}`);
    return;
  }
  if (max !== null && parsed > max) {
    errors.push(`${field} must be <= ${max}`);
  }
}

function validateOptionalDate(field, value, errors) {
  if (value === undefined || value === null || value === "") return;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} is invalid`);
  }
}

function validateFinanceSettleBody(body = {}) {
  const errors = [];
  requireNonEmpty("financeId", body.financeId, errors);
  return { valid: errors.length === 0, errors };
}

function validateLockPeriodBody(body = {}) {
  const errors = [];
  requireNonEmpty("period", body.period, errors);
  return { valid: errors.length === 0, errors };
}

function validatePlatformReconciliationRunBody(body = {}) {
  const errors = [];
  validateOptionalDate("date", body.date, errors);
  return { valid: errors.length === 0, errors };
}

function validateReconciliationQuery(query = {}) {
  const errors = [];
  if (query.type !== undefined && !String(query.type || "").trim()) {
    errors.push("type is required");
  }
  return { valid: errors.length === 0, errors };
}

function validatePlatformReconciliationListQuery(query = {}) {
  const errors = [];
  if (query.limit !== undefined) {
    requirePositiveInt("limit", query.limit, errors, { min: 1, max: 100 });
  }
  return { valid: errors.length === 0, errors };
}

function validatePlatformCommissionQuery(query = {}) {
  const errors = [];
  validateOptionalDate("from", query.from, errors);
  validateOptionalDate("to", query.to, errors);
  if (query.limit !== undefined) {
    requirePositiveInt("limit", query.limit, errors, { min: 1, max: 1000 });
  }
  return { valid: errors.length === 0, errors };
}

function validateTaxRuleBody(body = {}) {
  const errors = [];
  requireNonEmpty("name", body.name, errors);
  requireNonEmpty("type", body.type, errors);
  const rate = Number(body.rate);
  if (!Number.isFinite(rate) || rate < 0) {
    errors.push("rate must be >= 0");
  }
  return { valid: errors.length === 0, errors };
}

function validateTaxIdParam(params = {}) {
  const errors = [];
  requireNonEmpty("id", params.id, errors);
  return { valid: errors.length === 0, errors };
}

function validateOrderIdParam(params = {}) {
  const errors = [];
  requireNonEmpty("orderId", params.orderId, errors);
  return { valid: errors.length === 0, errors };
}

function validateVatReportQuery(query = {}) {
  const errors = [];
  validateOptionalDate("from", query.from, errors);
  validateOptionalDate("to", query.to, errors);
  if (query.limit !== undefined) {
    requirePositiveInt("limit", query.limit, errors, { min: 1, max: 1000 });
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateFinanceSettleBody,
  validateLockPeriodBody,
  validatePlatformReconciliationRunBody,
  validateReconciliationQuery,
  validatePlatformReconciliationListQuery,
  validatePlatformCommissionQuery,
  validateTaxRuleBody,
  validateTaxIdParam,
  validateOrderIdParam,
  validateVatReportQuery,
};
