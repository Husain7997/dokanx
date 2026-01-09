const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { createAudit } = require("../utils/audit.util");

// CUSTOMER → place order
exports.placeOrder = async (req, res) => {
  try {
    const shop = req.shop;
    const user = req.user;
    const { items } = req.body;

    let orderItems = [];
    let totalAmount = 0;
    if (!req.body || !Array.isArray(req.body.items)) {
      return res.status(400).json({
        success: false,
        message: "Order items are required"
      });
    }
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        shop: shop._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      totalAmount += product.price * item.quantity;
    }

    const order = new Order({
      shop: shop._id,
      user: user._id,
      items: orderItems,
      totalAmount,
    });

    await order.save();
await createAudit({
      performedBy: user._id,
      action: "PLACE_ORDER",
      targetType: "Order",
      targetId: order._id,
      req
    });
    res.status(201).json({
      success: true,
      data: order,
    });
    
  }

  catch (error) {
    console.error("ORDER ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: "Order failed",
    });
  }


};

// OWNER / ADMIN → shop orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ shop: req.shop._id })
      .populate("items.product", "name price")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("GET ORDERS ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// ADMIN → all orders
exports.getAllOrders = async (req, res) => {
  const page = Number(req.query.page) || 0;
  const limit = Number(req.query.limit) || 10;

  const orders = await Order.find()
    .skip(page * limit)
    .limit(limit)
    .populate("user shop");

  const total = await Order.countDocuments();

  res.json({
    success: true,
    page,
    limit,
    total,
    data: orders,
  });
};
