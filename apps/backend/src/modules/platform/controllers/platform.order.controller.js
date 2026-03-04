const Order =
  require('../../../models/order.model');

const { t } =
  require('@/core/infrastructure');

exports.createOrder = async (req, res) => {

  const { shopId } = req.platform;

  const order = await Order.create({
    ...req.body,
    shopId,
  });

  res.json({
    message: t(req, 'ORDER_CREATED'),
    order,
  });
};