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

function validateSearchQuery(input) {
  const errors = [];

  if (
    !isNonEmptyString(input.q) &&
    !isNonEmptyString(input.barcode) &&
    !isNonEmptyString(input.brand) &&
    !isNonEmptyString(input.category)
  ) {
    errors.push("At least one of q, barcode, brand or category is required");
  }

  if (input.limit !== undefined) {
    const limit = Number(input.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      errors.push("limit must be between 1 and 100");
    }
  }

  if (input.brand !== undefined && !isOptionalString(input.brand)) {
    errors.push("brand must be a string");
  }

  if (input.category !== undefined && !isOptionalString(input.category)) {
    errors.push("category must be a string");
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

function validateImport(input) {
  const errors = [];

  if (!isNonEmptyString(input.globalProductId)) {
    errors.push("globalProductId is required");
  }

  if (input.price !== undefined) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.push("price must be a non-negative number");
    }
  }

  if (input.stock !== undefined) {
    const stock = Number(input.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      errors.push("stock must be a non-negative number");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateCreateGlobalProduct(input) {
  const errors = [];

  if (!isNonEmptyString(input.name)) {
    errors.push("name is required");
  }

  if (input.brand !== undefined && !isOptionalString(input.brand)) {
    errors.push("brand must be a string");
  }

  if (input.category !== undefined && !isOptionalString(input.category)) {
    errors.push("category must be a string");
  }

  if (input.barcode !== undefined && !isOptionalString(input.barcode)) {
    errors.push("barcode must be a string");
  }

  if (input.imageUrl !== undefined && !isOptionalString(input.imageUrl)) {
    errors.push("imageUrl must be a string");
  }

  if (input.aliases !== undefined) {
    if (!Array.isArray(input.aliases)) {
      errors.push("aliases must be an array of strings");
    } else if (!input.aliases.every(v => typeof v === "string")) {
      errors.push("aliases must be an array of strings");
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateSuggest,
  validateSearchQuery,
  validateDecision,
  validateImport,
  validateCreateGlobalProduct,
};
