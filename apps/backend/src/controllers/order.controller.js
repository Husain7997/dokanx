const Order = require('../models/order.model');
const Product = require('../models/product.model');
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      shopId: req.shop._id,
    })
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
    await createAudit({
      action: "PLACE_ORDER",
      performedBy: user._id,
      targetType: "Order",
      targetId: order._id,
      req
    });
  } catch (error) {
    console.error('GET ORDERS ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });

  }
};


exports.placeOrder = async (req, res) => {
  try {
    const shop = req.shop;      // tenant middleware থেকে
    const user = req.user;      // auth middleware থেকে

    const { items } = req.body;
    // console.log('AUTH USER:', req.user);

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
          message: 'Product not found'
        });
      }

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });

      totalAmount += product.price * item.quantity;
    }

    // ✅ THIS IS THE MISSING PART
    const order = new Order({
      shop: shop._id,     // 🔥 REQUIRED
      user: user._id,     // 🔥 REQUIRED
      items: orderItems,
      totalAmount
    });

    await order.save();

    res.status(201).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('ORDER ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Order failed'
    });
  }
};

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
    data: orders
  });
};
