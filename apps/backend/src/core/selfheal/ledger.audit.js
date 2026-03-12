const Wallet =
 require("@/models/wallet.model");

const Ledger =
 require("@/modules/ledger/ledger.model");
const { calculateLedgerDelta } =
 require("@/core/financial/ledger.delta");

exports.findInconsistencies =
async () => {

  const issues = [];

  const wallets =
    await Wallet.find({});

  for (const wallet of wallets) {

    const entries =
      await Ledger.find({ shopId: wallet.shopId })
        .select("amount type meta")
        .lean();

    const expected =
      calculateLedgerDelta(entries);

    if (expected !== wallet.balance) {

      issues.push({
        shopId: wallet.shopId,
        diff: expected - wallet.balance
      });

    }
  }

  return issues;
};
