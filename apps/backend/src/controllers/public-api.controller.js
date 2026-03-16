const Product = require("../models/product.model");
const Order = require("../models/order.model");
const Inventory = require("../models/Inventory.model");
const User = require("../models/user.model");
const Wallet = require("../models/wallet.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const Order = require("../models/order.model");
const { creditWallet, debitWallet } = require("../services/wallet.service");
const { randomToken } = require("../utils/crypto.util");
const mongoose = require("mongoose");
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

exports.getWalletSummary = async (req, res) => {
  const { shopId } = req.query;
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const wallet = await Wallet.findOne({ shopId }).lean();
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });

  res.json({ data: wallet });
};

exports.creditWallet = async (req, res) => {
  const { shopId, amount, referenceId } = req.body || {};
  if (!shopId || !amount) return res.status(400).json({ message: "shopId and amount required" });

  const result = await creditWallet({
    shopId,
    amount,
    referenceId: referenceId || `api-credit-${Date.now()}`,
  });

  res.json({ message: "Wallet credited", data: result });
};

exports.debitWallet = async (req, res) => {
  const { shopId, amount, referenceId } = req.body || {};
  if (!shopId || !amount) return res.status(400).json({ message: "shopId and amount required" });

  await debitWallet({
    shopId,
    amount,
    referenceId: referenceId || `api-debit-${Date.now()}`,
  });

  res.json({ message: "Wallet debited" });
};

exports.initiatePayment = async (req, res) => {
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ message: "orderId required" });

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const attempt = await PaymentAttempt.findOne({
    order: orderId,
    status: "PENDING",
  });

  if (attempt) {
    return res.json({
      data: {
        attemptId: attempt._id,
        providerPaymentId: attempt.providerPaymentId,
      },
    });
  }

  const providerPaymentId = `pay_${new mongoose.Types.ObjectId()}`;
  const created = await PaymentAttempt.create({
    order: orderId,
    shopId: order.shopId,
    amount: order.totalAmount,
    provider: "public",
    gateway: "public",
    providerPaymentId,
    status: "PENDING",
    processed: false,
  });

  res.status(201).json({
    data: {
      attemptId: created._id,
      providerPaymentId,
    },
  });
};

exports.shippingRates = async (req, res) => {
  const { destination } = req.query;
  if (!destination) return res.status(400).json({ message: "destination required" });

  res.json({
    data: [
      { id: randomToken(6), name: "Standard", fee: 120, etaDays: 3 },
      { id: randomToken(6), name: "Express", fee: 220, etaDays: 1 },
    ],
  });
};

exports.notImplemented = (_req, res) => {
  res.status(501).json({ message: "Not implemented yet" });
};
