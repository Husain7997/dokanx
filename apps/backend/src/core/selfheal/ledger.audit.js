const Wallet = require("@/models/wallet.model");
const Ledger = require("@/modules/ledger/ledger.model");

exports.findInconsistencies = async () => {
  const maxWallets = Number(process.env.RECOVERY_AUDIT_MAX_WALLETS || 200);

  const [wallets, ledgerBalances] = await Promise.all([
    Wallet.find({}, { shopId: 1, balance: 1 }).limit(maxWallets).lean(),
    Ledger.aggregate([
      { $group: { _id: "$shopId", balance: { $sum: "$amount" } } },
      { $limit: maxWallets },
    ]),
  ]);

  const balanceByShop = new Map(
    ledgerBalances.map((entry) => [String(entry._id), Number(entry.balance || 0)])
  );

  const issues = [];
  for (const wallet of wallets) {
    const shopId = String(wallet.shopId);
    const expected = balanceByShop.get(shopId) || 0;
    const current = Number(wallet.balance || 0);
    if (expected !== current) {
      issues.push({
        shopId: wallet.shopId,
        diff: expected - current,
      });
    }
  }

  return issues;
};
