function validateCreateReferralBody(body = {}) {
  const errors = [];
  if (!String(body.refereePhone || "").trim()) errors.push("refereePhone is required");

  const rewardAmount = Number(body.rewardAmount || 0);
  if (!Number.isFinite(rewardAmount) || rewardAmount < 0) {
    errors.push("rewardAmount must be >= 0");
  }

  return { valid: errors.length === 0, errors };
}

function validateRedeemReferralBody(body = {}) {
  const errors = [];
  if (!String(body.code || "").trim()) errors.push("code is required");
  return { valid: errors.length === 0, errors };
}

function validateAffiliateCommissionBody(body = {}) {
  const errors = [];
  if (!String(body.affiliateUserId || "").trim()) errors.push("affiliateUserId is required");
  if (!String(body.orderId || "").trim()) errors.push("orderId is required");

  const orderAmount = Number(body.orderAmount);
  if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
    errors.push("orderAmount must be greater than 0");
  }

  const commissionAmount = Number(body.commissionAmount);
  if (!Number.isFinite(commissionAmount) || commissionAmount < 0) {
    errors.push("commissionAmount must be >= 0");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateCreateReferralBody,
  validateRedeemReferralBody,
  validateAffiliateCommissionBody,
};
