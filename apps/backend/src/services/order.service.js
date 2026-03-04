const Order = require('../models/order.model');
const { addJob } = require('../infrastructure/queue');

async function createOrder(data) {

  const order = await Order.create(data);

  /**
   * Emit Projection Event
   */

  await addJob(
    'projection-queue',
    'order-created',
    {
      type: 'ORDER_CREATED',
      payload: { order },
    }
  );

  return order;
}

module.exports = {
  createOrder,
};