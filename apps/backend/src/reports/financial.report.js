const Ledger =
require("../models/ledger.model");

exports.shopFinancialSummary =
async (shopId) => {

  return Ledger.aggregate([
    {
      $match: { shop: shopId },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);
};
