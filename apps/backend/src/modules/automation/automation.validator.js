function validateRuleBody(body = {}) {
  const errors = [];
  if (!String(body.name || "").trim()) errors.push("name is required");
  if (!String(body.trigger || "").trim()) errors.push("trigger is required");
  if (!Array.isArray(body.actions) || body.actions.length === 0) {
    errors.push("actions must be a non-empty array");
  }
  if (body.conditions !== undefined && !Array.isArray(body.conditions)) {
    errors.push("conditions must be an array");
  }
  return { valid: errors.length === 0, errors };
}

function validateExecuteBody(body = {}) {
  const errors = [];
  if (!String(body.trigger || "").trim()) errors.push("trigger is required");
  return { valid: errors.length === 0, errors };
}

function validateTaskQuery(query = {}) {
  const errors = [];
  if (query.status && !["OPEN", "COMPLETED", "CANCELLED"].includes(String(query.status).trim().toUpperCase())) {
    errors.push("status is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validateLoyaltyQuery(query = {}) {
  const errors = [];
  if (!String(query.customerUserId || "").trim() && !String(query.customerPhone || "").trim() && query.customerUserId !== undefined) {
    errors.push("customerUserId is invalid");
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateRuleBody,
  validateExecuteBody,
  validateTaskQuery,
  validateLoyaltyQuery,
};
