const OrderReadModel = require('./order.readModel');
const ShopDashboard = require('./shopDashboard.readModel');
const { resolveShopId } = require('../../utils/order-normalization.util');

/**
 * Handles events → projections
 */

async function handleOrderCreated(event) {

  const { order } = event;
  const shopId = resolveShopId(order);
  const total = order.total || order.totalAmount || 0;

  await OrderReadModel.create({
    orderId: order._id,
    shopId,
    total,
    status: order.status,
  });

  await ShopDashboard.findOneAndUpdate(
    { shopId },
    {
      $inc: {
        totalOrders: 1,
        totalSales: total,
      },
    },
    { upsert: true }
  );
}

module.exports = {
  handleOrderCreated,
};
