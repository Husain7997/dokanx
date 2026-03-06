const mongoose = require("mongoose");
const FinancialEngine =
  require("@/core/financial/financial.engine");

  
const Wallet = require("@/models/wallet.model");


async function creditWallet({
  shopId,
  amount,
  referenceId
}) {

  const wallet =
    await Wallet.findOne({ shopId });

  if (wallet?.status === "FROZEN" || wallet?.isFrozen)
    throw new Error("Wallet is frozen");

  return FinancialEngine.execute({
    tenantId: shopId,
    idempotencyKey: referenceId,
    entries: [
      {
        type: "debit",
        amount,
        meta: { reason: "wallet_credit" }
      },
      {
        type: "credit",
        amount,
        meta: { reason: "wallet_credit" }
      }
    ]
  });
}




async function debitWallet({
  shopId,
  amount,
  referenceId
}) {

  const wallet =
    await Wallet.findOne({ shopId });

  if (!wallet)
    throw new Error("Wallet not found");

  if (wallet.status === "FROZEN" || wallet.isFrozen)
    throw new Error("Wallet is frozen");

  if (wallet.withdrawable_balance < amount)
    throw new Error("Insufficient balance");

  return FinancialEngine.execute({
    tenantId: shopId,
    idempotencyKey: referenceId,
    entries: [
      {
        type: "debit",
        amount,
        meta: { reason: "wallet_debit" }
      },
      {
        type: "credit",
        amount,
        meta: { reason: "wallet_debit" }
      }
    ]
  });
}
module.exports = {
  creditWallet,
  debitWallet
};