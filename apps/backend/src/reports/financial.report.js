const Ledger = require("../modules/ledger/ledger.model");

exports.shopFinancialSummary =
async (shopId) => {

  return Ledger.aggregate([
    {
      $match: { shopId: shopId },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);
};
