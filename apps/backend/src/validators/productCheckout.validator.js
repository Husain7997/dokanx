function requireNonEmpty(field, value, errors) {
  if (!String(value || "").trim()) {
    errors.push(`${field} is required`);
  }
}

function requirePositiveOrZero(field, value, errors) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    errors.push(`${field} must be >= 0`);
  }
}

function validateItems(items, errors, { allowEmpty = false } = {}) {
  if (!Array.isArray(items) || (!allowEmpty && items.length === 0)) {
    errors.push("items must be a non-empty array");
    return;
  }

  items.forEach((item, index) => {
    requireNonEmpty(`items[${index}].product`, item?.product, errors);
    const quantity = Number(item?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`items[${index}].quantity must be greater than 0`);
    }
  });
}

function validateProductCreateBody(body = {}) {
  const errors = [];
  requireNonEmpty("name", body.name, errors);
  if (body.price !== undefined) requirePositiveOrZero("price", body.price, errors);
  if (body.stock !== undefined) requirePositiveOrZero("stock", body.stock, errors);
  return { valid: errors.length === 0, errors };
}

function validateProductUpdateBody(body = {}) {
  const errors = [];
  const allowedKeys = ["name", "brand", "category", "barcode", "imageUrl", "price", "stock"];
  const hasAllowedField = allowedKeys.some((key) => body[key] !== undefined);

  if (!hasAllowedField) {
    errors.push("At least one product field is required");
  }

  if (body.name !== undefined) requireNonEmpty("name", body.name, errors);
  if (body.price !== undefined) requirePositiveOrZero("price", body.price, errors);
  if (body.stock !== undefined) requirePositiveOrZero("stock", body.stock, errors);

  return { valid: errors.length === 0, errors };
}

function validateSmartSuggestBody(body = {}) {
  const errors = [];
  const localProduct = body.localProduct || {};
  const name = String(localProduct.name || body.name || "").trim();
  const barcode = String(localProduct.barcode || body.barcode || "").trim();

  if (!name && !barcode) {
    errors.push("name or barcode is required");
  }

  if (body.limit !== undefined) {
    const limit = Number(body.limit);
    if (!Number.isFinite(limit) || limit < 1) {
      errors.push("limit must be >= 1");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateShopIdParam(params = {}) {
  const errors = [];
  requireNonEmpty("shopId", params.shopId, errors);
  return { valid: errors.length === 0, errors };
}

function validateProductIdParam(params = {}) {
  const errors = [];
  requireNonEmpty("productId", params.productId, errors);
  return { valid: errors.length === 0, errors };
}

function validateCheckoutBody(body = {}) {
  const errors = [];
  validateItems(body.items, errors);
  requirePositiveOrZero("totalAmount", body.totalAmount, errors);
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateProductCreateBody,
  validateProductUpdateBody,
  validateSmartSuggestBody,
  validateShopIdParam,
  validateProductIdParam,
  validateCheckoutBody,
};
