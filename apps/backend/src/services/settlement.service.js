const Settlement = require("../models/settlement.model");
const Wallet = require("../models/wallet.model");

exports.processSettlement = async ({
  shopId,
  grossAmount,
  fee,
  idempotencyKey,
}) => {
  if (!shopId) throw new Error("shopId required");

  // 🔒 Idempotency
  const existing = await Settlement.findOne({ idempotencyKey });
  if (existing) return existing;

  const netAmount = grossAmount - fee;

  const settlement = await Settlement.create({
    shopId,
    grossAmount,
    fee,
    netAmount,
    status: "COMPLETED",
    idempotencyKey,
  });

  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) throw new Error("Wallet not found");

  wallet.pending_settlement -= grossAmount;
  wallet.withdrawable_balance += netAmount;

  await wallet.save();

  return settlement;
};
