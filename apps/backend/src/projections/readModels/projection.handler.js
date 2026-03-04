const OrderReadModel = require('./order.readModel');
const ShopDashboard = require('./shopDashboard.readModel');

/**
 * Handles events → projections
 */

async function handleOrderCreated(event) {

  const { order } = event;

  await OrderReadModel.create({
    orderId: order._id,
    shopId: order.shopId,
    total: order.total,
    status: order.status,
  });

  await ShopDashboard.findOneAndUpdate(
    { shopId: order.shopId },
    {
      $inc: {
        totalOrders: 1,
        totalSales: order.total,
      },
    },
    { upsert: true }
  );
}

module.exports = {
  handleOrderCreated,
};