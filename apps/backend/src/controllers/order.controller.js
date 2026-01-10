const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { createAudit } = require("../utils/audit.util");
const crypto = require("crypto");


exports.placeOrder = async (req, res) => {
  try {
    const shop = req.shop;                 // tenant middleware
    const user = req.user || null;         // OPTIONAL

    const { items, email, phone } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items required"
      });
    }
    if (!req.user && !phone && !email) {
      return res.status(400).json({
        success: false,
        message: "Guest orders require phone or email"
      });
    }

    // 🔹 Guest identifier
    const guestId = user ? null : crypto.randomUUID();

    const isGuest = !req.user;

    if (!isGuest && req.user.isBlocked) {
      return res.status(403).json({ message: "User blocked" });
    }

    if (!shop.isActive) {
      return res.status(403).json({ message: "Shop suspended" });
    }

    let orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        shop: shop._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });

      totalAmount += product.price * item.quantity;
    }

    // ✅ CREATE ORDER
    const order = new Order({
      shop: shop._id,
      user: req.user ? req.user._id : null,
      items: orderItems,
      totalAmount
    });

    // ✅ AUDIT LOG
    await createAudit({
      action: "ORDER_CREATED",
      performedBy: user ? user._id : null,
      targetType: "Order",
      targetId: order._id,
      meta: {
        guest: !user,
        email,
        phone
      },
      req
    });

    res.status(201).json({
      success: true,
      guest: !user,
      data: order
    });

  } catch (error) {
    console.error("ORDER ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: "Order failed"
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
