function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value) {
  return value === undefined || value === null || typeof value === "string";
}

function validateSuggest(input) {
  const errors = [];

  if (!isNonEmptyString(input.name) && !isNonEmptyString(input.barcode)) {
    errors.push("Either name or barcode is required");
  }

  if (input.limit !== undefined) {
    const limit = Number(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
      errors.push("limit must be between 1 and 50");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateDecision(input) {
  const errors = [];
  const action = String(input.action || "").toUpperCase();

  if (!["ACCEPT", "EDIT", "IGNORE"].includes(action)) {
    errors.push("action must be ACCEPT, EDIT or IGNORE");
  }

  if (input.query && typeof input.query !== "object") {
    errors.push("query must be an object");
  }

  if (input.localProduct !== undefined && typeof input.localProduct !== "object") {
    errors.push("localProduct must be an object");
  }

  if (input.allowCreateGlobal !== undefined && typeof input.allowCreateGlobal !== "boolean") {
    errors.push("allowCreateGlobal must be boolean");
  }

  if (input.globalProductId !== undefined && !isOptionalString(input.globalProductId)) {
    errors.push("globalProductId must be a string");
  }

  if (input.productId !== undefined && !isOptionalString(input.productId)) {
    errors.push("productId must be a string");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateSuggest,
  validateDecision,
};
