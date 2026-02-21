const Shop = require("../models/shop.model");
const Order = require("../models/order.model");

exports.metrics = async (_, res) => {
  const shops = await Shop.countDocuments();
  const orders = await Order.countDocuments();

  res.json({
    shops,
    orders,
  });
};
