const Wallet =
 require("@/models/wallet.model");

const Ledger =
 require("@/modules/ledger/ledger.model");

exports.findInconsistencies =
async () => {

  const issues = [];

  const wallets =
    await Wallet.find({});

  for (const wallet of wallets) {

    const agg =
      await Ledger.aggregate([
        { $match:{shopId:wallet.shopId}},
        {
          $group:{
            _id:null,
            balance:{ $sum:"$amount"}
          }
        }
      ]);

    const expected =
      agg[0]?.balance || 0;

    if (expected !== wallet.balance) {

      issues.push({
        shopId: wallet.shopId,
        diff: expected - wallet.balance
      });

    }
  }

  return issues;
};