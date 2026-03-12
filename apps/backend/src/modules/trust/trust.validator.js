function validateProductReviewBody(body = {}) {
  const errors = [];

  if (!String(body.productId || "").trim()) errors.push("productId is required");
  if (!String(body.orderId || "").trim()) errors.push("orderId is required");

  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    errors.push("rating must be between 1 and 5");
  }

  return { valid: errors.length === 0, errors };
}

function validateShopReviewBody(body = {}) {
  const errors = [];

  if (!String(body.orderId || "").trim()) errors.push("orderId is required");

  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    errors.push("rating must be between 1 and 5");
  }

  return { valid: errors.length === 0, errors };
}

function validateBuyerClaimBody(body = {}) {
  const errors = [];

  if (!String(body.orderId || "").trim()) errors.push("orderId is required");
  if (!String(body.description || "").trim()) errors.push("description is required");

  const issueType = String(body.issueType || "").trim().toUpperCase();
  if (!["NOT_DELIVERED", "WRONG_PRODUCT", "DAMAGED_PRODUCT", "OTHER"].includes(issueType)) {
    errors.push("issueType is invalid");
  }

  return { valid: errors.length === 0, errors };
}

function validateShopIdParam(params = {}) {
  const errors = [];
  if (!String(params.shopId || "").trim()) errors.push("shopId is required");
  return { valid: errors.length === 0, errors };
}

function validateProductIdParam(params = {}) {
  const errors = [];
  if (!String(params.productId || "").trim()) errors.push("productId is required");
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateProductReviewBody,
  validateShopReviewBody,
  validateBuyerClaimBody,
  validateShopIdParam,
  validateProductIdParam,
};
