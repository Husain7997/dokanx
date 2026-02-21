const Settlement = require("../models/settlement.model");
const Wallet = require("../models/wallet.model");
const bus =
require("../infrastructure/events/eventBus");
const audit =
require("../infrastructure/audit/audit.service");


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
  totalAmount,
  commission,
  netPayout,
  idempotencyKey,
});



await audit.record({
  actor: "system",
  action: "SETTLEMENT_COMPLETED",
  entity: shopId,
});


bus.emit("SETTLEMENT_COMPLETED", {
  shopId,
});

  const wallet = await Wallet.findOne({ shopId });
  if (!wallet) throw new Error("Wallet not found");

  wallet.pending_settlement -= grossAmount;
  wallet.withdrawable_balance += netAmount;

  await wallet.save();

  return settlement;
};
