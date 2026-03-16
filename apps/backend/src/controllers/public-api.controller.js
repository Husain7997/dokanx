const Product = require("../models/product.model");
const Order = require("../models/order.model");
const Inventory = require("../models/Inventory.model");
const User = require("../models/user.model");
const { dispatchWebhooks } = require("../services/webhook.service");

exports.listProducts = async (req, res) => {
  const { shopId } = req.query;
  const filter = {};
  if (shopId) filter.shopId = shopId;
  const products = await Product.find(filter).lean();
  res.json({ data: products });
};

exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.params.productId).lean();
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ data: product });
};

exports.createOrder = async (req, res) => {
  const { shopId, items, totalAmount, contact } = req.body || {};
  if (!shopId || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: "shopId and items required" });
  }

  const enrichedItems = [];
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(400).json({ message: "Invalid product in cart" });
    }
    enrichedItems.push({
      product: product._id,
      quantity: item.quantity,
      price: product.price,
    });
  }

  const order = await Order.create({
    shopId,
    items: enrichedItems,
    totalAmount,
    isGuest: true,
    contact: contact || {},
  });

  await dispatchWebhooks("order.created", { orderId: order._id, shopId });

  res.status(201).json({ data: order });
};

exports.listCustomers = async (req, res) => {
  const { shopId } = req.query;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const users = await User.find({ role: "CUSTOMER", shopId }).select("name email phone").lean();
  res.json({ data: users });
};

exports.listInventory = async (req, res) => {
  const { shopId } = req.query;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const items = await Inventory.find({ shopId }).lean();
  res.json({ data: items });
};

exports.notImplemented = (_req, res) => {
  res.status(501).json({ message: "Not implemented yet" });
};
