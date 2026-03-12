const PAYMENT_TYPES = ["CASH", "BKASH", "CARD"];

function validateQueuePayload(body = {}) {
  const errors = [];

  if (!String(body.terminalId || "").trim()) {
    errors.push("terminalId is required");
  }

  if (!String(body.clientMutationId || "").trim()) {
    errors.push("clientMutationId is required");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push("items must be a non-empty array");
  }

  if (!Array.isArray(body.paymentTypes) || body.paymentTypes.length === 0) {
    errors.push("paymentTypes must be a non-empty array");
  } else {
    const invalid = body.paymentTypes.find(type => !PAYMENT_TYPES.includes(String(type || "").trim().toUpperCase()));
    if (invalid) {
      errors.push("paymentTypes must contain only CASH, BKASH or CARD");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  PAYMENT_TYPES,
  validateQueuePayload,
};
