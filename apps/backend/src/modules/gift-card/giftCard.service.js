const GiftCard = require("./models/giftCard.model");

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function createGiftCard({ shopId, payload }) {
  const balance = toNumber(payload.balance, 0);
  return GiftCard.create({
    shopId,
    code: asUpper(payload.code),
    initialBalance: balance,
    remainingBalance: balance,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    issuedTo: String(payload.issuedTo || "").trim(),
    metadata: payload.metadata || {},
  });
}

async function listGiftCards({ shopId }) {
  return GiftCard.find({ shopId }).sort({ createdAt: -1 }).lean();
}

async function redeemGiftCard({ shopId, code, amount }) {
  const row = await GiftCard.findOne({ shopId, code: asUpper(code) });
  if (!row) {
    const err = new Error("Gift card not found");
    err.statusCode = 404;
    throw err;
  }
  if (row.status !== "ACTIVE") {
    const err = new Error("Gift card is not active");
    err.statusCode = 409;
    throw err;
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    row.status = "EXPIRED";
    await row.save();
    const err = new Error("Gift card expired");
    err.statusCode = 409;
    throw err;
  }

  const debit = toNumber(amount, 0);
  if (debit <= 0 || debit > row.remainingBalance) {
    const err = new Error("Invalid redemption amount");
    err.statusCode = 400;
    throw err;
  }

  row.remainingBalance = Number((row.remainingBalance - debit).toFixed(2));
  if (row.remainingBalance === 0) row.status = "REDEEMED";
  await row.save();
  return row;
}

module.exports = {
  createGiftCard,
  listGiftCards,
  redeemGiftCard,
};
