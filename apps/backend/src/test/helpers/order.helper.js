const Order = require("../../models/order.model");

async function createPaidOrders(shopId, count, amount) {
  const orders = [];

  for (let i = 0; i < count; i++) {
    orders.push({
      shop: shopId,
      totalAmount: amount,
      status: "CONFIRMED",
      payment: {
        status: "SUCCESS",
        method: "TEST",
        paidAt: new Date(),
      },
      isSettled: false,
    });
  }

  await Order.insertMany(orders);
}

module.exports = { createPaidOrders };
