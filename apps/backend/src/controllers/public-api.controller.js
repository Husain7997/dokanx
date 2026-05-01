const Product = require("../models/product.model");
const Order = require("../models/order.model");
const Inventory = require("../models/Inventory.model");
const User = require("../models/user.model");
const Wallet = require("../models/wallet.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const { creditWallet, debitWallet } = require("../services/wallet.service");
const { randomToken } = require("../utils/crypto.util");
const mongoose = require("mongoose");
const { dispatchWebhooks } = require("../services/webhook.service");
const { resolveShopId } = require("../utils/order-normalization.util");
const { simulatePaymentAttempt, enqueueSandboxLifecycle } = require("../modules/sandbox-engine/sandbox.service");
const { recordPlatformAudit } = require("../modules/platform-hardening/platform-audit.service");
const {
  createReadQuery,
  createReadOneQuery,
} = require("../infrastructure/database/mongo.client");

exports.listProducts = async (req, res) => {
  const shopId = req.platformContext?.shopId || req.query.shopId;
  const filter = {};
  if (shopId) filter.shopId = shopId;
  const products = await createReadQuery(Product, filter).lean();
  res.json({ data: products });
};

exports.getProduct = async (req, res) => {
  const product = await createReadOneQuery(Product, { _id: req.params.productId }).lean();
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ data: product });
};

exports.createOrder = async (req, res) => {
  const { items, totalAmount, contact } = req.body || {};
  const shopId = req.platformContext?.shopId || req.body?.shopId;
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
    trafficType: req.body?.trafficType || "marketplace",
    metadata: {
      ...(req.body?.metadata || {}),
      publicApi: true,
      sandboxMode: Boolean(req.platformContext?.sandboxMode),
      appId: req.platformContext?.appId || null,
    },
  });

  await dispatchWebhooks("order.created", { orderId: order._id, shopId });
  if (req.platformContext?.sandboxMode) {
    await enqueueSandboxLifecycle({
      orderId: order._id,
      shopId,
      simulation: String(req.body?.sandboxScenario || "success"),
    });
  }

  res.status(201).json({ data: order });
};

exports.listCustomers = async (req, res) => {
  const shopId = req.platformContext?.shopId || req.query.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const users = await createReadQuery(User, { role: "CUSTOMER", shopId }).select("name email phone").lean();
  res.json({ data: users });
};

exports.listOrders = async (req, res) => {
  const shopId = req.platformContext?.shopId || req.query.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const orders = await createReadQuery(Order, { shopId }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ data: orders });
};

exports.listShops = async (req, res) => {
  const Shop = require("../models/shop.model");
  const filter = {};
  const shopId = req.platformContext?.shopId || req.query.shopId;
  if (shopId) filter._id = shopId;
  const shops = await createReadQuery(Shop, filter).select("name slug domain isActive commissionRate").lean();
  res.json({ data: shops });
};

exports.listInventory = async (req, res) => {
  const shopId = req.platformContext?.shopId || req.query.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const items = await createReadQuery(Inventory, { shopId }).lean();
  res.json({ data: items });
};

exports.getWalletSummary = async (req, res) => {
  const shopId = req.platformContext?.shopId || req.query.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const wallet = await createReadOneQuery(Wallet, { shopId }).lean();
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });

  res.json({ data: wallet });
};

exports.creditWallet = async (req, res) => {
  const { amount, referenceId } = req.body || {};
  const shopId = req.platformContext?.shopId || req.body?.shopId;
  if (!shopId || !amount) return res.status(400).json({ message: "shopId and amount required" });

  const result = await creditWallet({
    shopId,
    amount,
    referenceId: referenceId || `api-credit-${Date.now()}`,
  });

  await recordPlatformAudit({
    action: "PUBLIC_API_WALLET_CREDIT",
    category: "financial_action",
    actorType: req.platformContext?.authType || "api_key",
    actorId: req.platformContext?.developerId || null,
    shopId,
    appId: req.platformContext?.appId || null,
    apiKeyId: req.platformContext?.apiKeyId || null,
    method: req.method,
    path: req.originalUrl,
    statusCode: 200,
    ip: req.platformContext?.clientIp || null,
    metadata: { amount },
  });

  res.json({ message: "Wallet credited", data: result });
};

exports.debitWallet = async (req, res) => {
  const { amount, referenceId } = req.body || {};
  const shopId = req.platformContext?.shopId || req.body?.shopId;
  if (!shopId || !amount) return res.status(400).json({ message: "shopId and amount required" });

  await debitWallet({
    shopId,
    amount,
    referenceId: referenceId || `api-debit-${Date.now()}`,
  });

  await recordPlatformAudit({
    action: "PUBLIC_API_WALLET_DEBIT",
    category: "financial_action",
    actorType: req.platformContext?.authType || "api_key",
    actorId: req.platformContext?.developerId || null,
    shopId,
    appId: req.platformContext?.appId || null,
    apiKeyId: req.platformContext?.apiKeyId || null,
    method: req.method,
    path: req.originalUrl,
    statusCode: 200,
    ip: req.platformContext?.clientIp || null,
    metadata: { amount },
  });

  res.json({ message: "Wallet debited" });
};

exports.initiatePayment = async (req, res) => {
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ message: "orderId required" });

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const shopId = resolveShopId(order);

  const attempt = await createReadOneQuery(PaymentAttempt, {
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
  const provider = req.platformContext?.sandboxMode ? "sandbox" : "public";
  const created = await PaymentAttempt.create({
    order: orderId,
    shopId,
    amount: order.totalAmount,
    provider,
    gateway: provider,
    providerPaymentId,
    status: "PENDING",
    processed: false,
  });

  if (req.platformContext?.sandboxMode) {
    await simulatePaymentAttempt({
      attemptId: created._id,
      mode: String(req.body?.sandboxPaymentResult || "success"),
    });
  }

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
