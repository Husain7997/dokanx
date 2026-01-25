const Order = require("../models/order.model");

exports.getShopEarningsReport = async ({ shopId, from, to }) => {
  const result = await Order.aggregate([
    {
      $match: {
        shop: shopId,
        settlementStatus: "SETTLED",
        settledAt: { $gte: from, $lte: to }
      }
    },
    {
      $group: {
        _id: null,
        gross: { $sum: "$totalAmount" },
        platformFee: { $sum: "$platformFee" },
        net: { $sum: "$shopEarning" },
        count: { $sum: 1 }
      }
    }
  ]);

  return result[0] || {
    gross: 0,
    platformFee: 0,
    net: 0,
    count: 0
  };
};
