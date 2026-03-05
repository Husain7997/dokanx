const Wallet = require("@/models/wallet.model");
const Ledger = require("@/modules/ledger/ledger.model");

async function applyTransaction(shopId, referenceId) {

  const entries =
    await Ledger.find({ shopId, referenceId });

  let delta = 0;

  for (const e of entries) {
    const reason = e.meta?.reason;

    if (reason === "wallet_credit" && e.type === "credit") {
      delta += e.amount;
      continue;
    }

    if (reason === "wallet_debit" && e.type === "debit") {
      delta -= e.amount;
      continue;
    }

    if (e.type === "credit") {
      delta += e.amount;
    } else {
      delta -= e.amount;
    }
  }

  await Wallet.findOneAndUpdate(
    { shopId },
    {
      $inc: {
        balance: delta,
        available_balance: delta,
        withdrawable_balance: delta
      }
    },
    { upsert: true }
  );
}

module.exports = { applyTransaction };
