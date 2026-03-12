const Wallet = require("@/models/wallet.model");
const Ledger = require("@/modules/ledger/ledger.model");
const { calculateLedgerDelta } = require("@/core/financial/ledger.delta");

async function applyTransaction(shopId, referenceId) {

  const entries =
    await Ledger.find({ shopId, referenceId });
  const delta = calculateLedgerDelta(entries);

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
