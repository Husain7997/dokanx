const Order =
  require("@/models/order.model");

exports.detectRevenueAnomaly =
async shopId => {

  const orders =
    await Order.find({ shop: shopId })
      .sort({ createdAt: -1 })
      .limit(20);

  if (orders.length < 5)
    return null;

  const avg =
    orders.reduce(
      (s,o)=>s+o.totalAmount,0
    ) / orders.length;

  const latest = orders[0];

  if (latest.totalAmount > avg * 3) {

    return {
      anomaly: true,
      value: latest.totalAmount,
      avg
    };
  }

  return { anomaly:false };
};