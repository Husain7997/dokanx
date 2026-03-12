function validateGiftCardBody(body = {}) {
  const errors = [];
  if (!String(body.code || "").trim()) errors.push("code is required");
  if (!Number.isFinite(Number(body.balance)) || Number(body.balance) <= 0) {
    errors.push("balance must be > 0");
  }
  return { valid: errors.length === 0, errors };
}

function validateRedeemBody(body = {}) {
  const errors = [];
  if (!Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) {
    errors.push("amount must be > 0");
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateGiftCardBody,
  validateRedeemBody,
};
