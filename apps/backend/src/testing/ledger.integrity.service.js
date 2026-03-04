const Ledger =
  require("@/modules/ledger/ledger.model");

exports.verifyLedger = async (shopId) => {

  const entries =
    await Ledger.find({ shopId })
      .sort({ createdAt: 1 });

  let balance = 0;

  for (const e of entries)
    balance += e.amount;

  return balance;
};