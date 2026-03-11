function validatePlaceOrderBody(body = {}) {
  const errors = [];

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push("items must be a non-empty array");
  } else {
    body.items.forEach((item, index) => {
      if (!String(item?.product || "").trim()) {
        errors.push(`items[${index}].product is required`);
      }

      const quantity = Number(item?.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors.push(`items[${index}].quantity must be greater than 0`);
      }
    });
  }

  const totalAmount = Number(body.totalAmount);
  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    errors.push("totalAmount must be a valid positive number");
  }

  if (body.shippingFee !== undefined) {
    const shippingFee = Number(body.shippingFee);
    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      errors.push("shippingFee must be a valid positive number");
    }
  }

  if (body.couponCode !== undefined && !String(body.couponCode || "").trim()) {
    errors.push("couponCode must not be empty");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateOrderStatusBody(body = {}) {
  const status = String(body.status || "").trim().toUpperCase();
  const allowed = [
    "PLACED",
    "PAYMENT_PENDING",
    "PAYMENT_FAILED",
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ];

  const errors = [];
  if (!allowed.includes(status)) {
    errors.push("status is invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validatePlaceOrderBody,
  validateOrderStatusBody,
};
