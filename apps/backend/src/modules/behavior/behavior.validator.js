function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateCustomerParams(input) {
  const errors = [];
  if (!isNonEmptyString(input.customerId)) errors.push("customerId param is required");
  return { valid: errors.length === 0, errors };
}

function validateScanBody(input) {
  const errors = [];
  if (input.maxCustomers !== undefined) {
    const n = Number(input.maxCustomers);
    if (!Number.isFinite(n) || n < 1 || n > 1000) {
      errors.push("maxCustomers must be between 1 and 1000");
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateSignalsQuery(input) {
  const errors = [];

  if (input.severity !== undefined) {
    const s = String(input.severity).toUpperCase();
    if (!["LOW", "MEDIUM", "HIGH"].includes(s)) {
      errors.push("severity must be LOW, MEDIUM or HIGH");
    }
  }

  if (input.resolved !== undefined) {
    const r = String(input.resolved).toLowerCase();
    if (!["true", "false"].includes(r)) {
      errors.push("resolved must be true or false");
    }
  }

  if (input.limit !== undefined) {
    const limit = Number(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      errors.push("limit must be between 1 and 200");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateResolveParams(input) {
  const errors = [];
  if (!isNonEmptyString(input.signalId)) errors.push("signalId param is required");
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateCustomerParams,
  validateScanBody,
  validateSignalsQuery,
  validateResolveParams,
};
