const crypto = require("crypto");
const Referral = require("./models/referral.model");
const AffiliateCommission = require("./models/affiliateCommission.model");

function createReferralCode(shopId) {
  return `REF_${String(shopId).slice(-6).toUpperCase()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function createReferral({ shopId, referrerUserId, payload }) {
  return Referral.create({
    shopId,
    referrerUserId,
    refereePhone: String(payload.refereePhone || "").trim(),
    code: createReferralCode(shopId),
    rewardAmount: Number(payload.rewardAmount || 0),
    status: "PENDING",
  });
}

async function redeemReferral({ shopId, userId, code }) {
  const referral = await Referral.findOne({
    shopId,
    code: String(code || "").trim().toUpperCase(),
  });

  if (!referral) {
    const err = new Error("Referral not found");
    err.statusCode = 404;
    throw err;
  }

  if (referral.status === "REDEEMED") {
    return referral;
  }

  referral.status = "REDEEMED";
  referral.redeemedByUserId = userId;
  referral.redeemedAt = new Date();
  await referral.save();
  return referral;
}

async function listReferrals({ shopId, status = null, limit = 50 }) {
  const query = { shopId };
  if (status) query.status = String(status).trim().toUpperCase();

  return Referral.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

async function createAffiliateCommission({ shopId, payload }) {
  return AffiliateCommission.create({
    shopId,
    affiliateUserId: payload.affiliateUserId,
    orderId: payload.orderId,
    orderAmount: Number(payload.orderAmount),
    commissionAmount: Number(payload.commissionAmount),
    status: "PENDING",
  });
}

async function listAffiliateCommissions({ shopId, affiliateUserId = null, limit = 50 }) {
  const query = { shopId };
  if (affiliateUserId) query.affiliateUserId = affiliateUserId;

  return AffiliateCommission.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

module.exports = {
  createReferral,
  redeemReferral,
  listReferrals,
  createAffiliateCommission,
  listAffiliateCommissions,
  _internals: {
    createReferralCode,
  },
};
