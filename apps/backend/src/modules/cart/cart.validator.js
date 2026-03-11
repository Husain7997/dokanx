function validateItems(items) {
  const errors = [];
  if (!Array.isArray(items)) {
    return { valid: false, errors: ["items must be an array"] };
  }

  items.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`items[${index}] must be an object`);
      return;
    }
    if (!item.productId) {
      errors.push(`items[${index}].productId is required`);
    }
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      errors.push(`items[${index}].quantity must be >= 1`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateSaveCartBody(body = {}) {
  return validateItems(body.items);
}

function validateMergeBody(body = {}) {
  const guestToken = String(body.guestToken || "").trim();
  if (!guestToken) {
    return {
      valid: false,
      errors: ["guestToken is required"],
    };
  }

  return { valid: true, errors: [] };
}

function validateApplyCouponBody(body = {}) {
  const code = String(body.code || "").trim();
  return {
    valid: Boolean(code),
    errors: code ? [] : ["code is required"],
  };
}

module.exports = {
  validateSaveCartBody,
  validateMergeBody,
  validateApplyCouponBody,
};
