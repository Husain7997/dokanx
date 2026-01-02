const Order = require('../models/order.model');
const Product = require('../models/product.model');

// Customer places order
const placeOrder = async (req, res) => {
  try {
    const { customerName, customerPhone, items } = req.body;

    if (!customerName || !customerPhone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid order data' });
    }

    let total = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({ message: 'Product not found' });
      }

      if (product.shop.toString() !== req.shop._id.toString()) {
        return res.status(403).json({ message: 'Product does not belong to this shop' });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `${product.name} out of stock` });
      }

      product.stock -= item.quantity;
      await product.save();

      item.price = product.price;
      total += product.price * item.quantity;
    }

    const order = await Order.create({
      shop: req.shop._id,
      customerName,
      customerPhone,
      items,
      totalAmount: total,
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Owner views orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ shop: req.shop._id })
      .populate('items.product');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  placeOrder,
  getOrders,
};
