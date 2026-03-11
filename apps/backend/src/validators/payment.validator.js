function validateInitiatePaymentBody(body = {}) {
  const errors = [];
  const paymentMethod = String(body.paymentMethod || "").trim();

  if (!paymentMethod) {
    errors.push("paymentMethod is required");
  }

  if (body.hasOwnGateway !== undefined && typeof body.hasOwnGateway !== "boolean") {
    errors.push("hasOwnGateway must be boolean");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateRetryPaymentBody(body = {}) {
  const errors = [];

  if (!String(body.orderId || "").trim()) {
    errors.push("orderId is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateRefundPaymentBody(body = {}) {
  const errors = [];

  if (!String(body.orderId || "").trim()) {
    errors.push("orderId is required");
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push("amount must be greater than 0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateInitiatePaymentBody,
  validateRetryPaymentBody,
  validateRefundPaymentBody,
};
