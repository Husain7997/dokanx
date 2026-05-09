const mongoose = require("mongoose");
const PosSession = require("../models/posSession.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const inventory = require("../inventory");
const walletService = require("../services/wallet.service");
const walletAdapter = require("../services/wallet/walletAdapter.service");
const { createAudit } = require("../utils/audit.util");
const { createLedgerEntry } = require("../services/ledger.service");

async function resolveCustomer(customerId) {
  if (!customerId) return null;

  const query = [{ globalCustomerId: customerId }];
  if (mongoose.Types.ObjectId.isValid(customerId)) {
    query.push({ _id: customerId });
  }

  const customer = await User.findOne({ $or: query })
    .select("_id globalCustomerId name email phone")
    .lean();
  return customer || null;
}

function normalizePaymentBreakdown(rawBreakdown, totalAmount) {
  if (!Array.isArray(rawBreakdown) || !rawBreakdown.length) {
    return [];
  }

  const breakdown = rawBreakdown
    .map((item) => ({
      mode: String(item?.mode || "").toUpperCase(),
      amount: Number(item?.amount || 0),
    }))
    .filter((item) => ["CASH", "ONLINE", "WALLET", "CREDIT"].includes(item.mode) && item.amount > 0)
    .map((item) => ({
      mode: item.mode,
      amount: Number(item.amount.toFixed(2)),
    }));

  const sum = breakdown.reduce((acc, item) => acc + item.amount, 0);
  if (!breakdown.length || Math.abs(sum - totalAmount) > 0.01) {
    const error = new Error("paymentBreakdown must match the order total");
    error.statusCode = 400;
    throw error;
  }

  return breakdown;
}

exports.openSession = async (req, res) => {
  const { openingBalance } = req.body || {};
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const session = await PosSession.create({
    shopId,
    userId: req.user._id,
    openingBalance: Number(openingBalance) || 0,
  });

  res.status(201).json({ data: session });

  await createAudit({
    action: "OPEN_POS_SESSION",
    performedBy: req.user?._id,
    targetType: "PosSession",
    targetId: session._id,
    req,
  });
};

exports.closeSession = async (req, res) => {
  const { sessionId } = req.params;
  const { closingBalance } = req.body || {};

  const session = await PosSession.findById(sessionId);
  if (!session) return res.status(404).json({ message: "Session not found" });

  session.status = "CLOSED";
  session.closedAt = new Date();
  session.closingBalance = Number(closingBalance) || 0;
  await session.save();

  res.json({ data: session });

  await createAudit({
    action: "CLOSE_POS_SESSION",
    performedBy: req.user?._id,
    targetType: "PosSession",
    targetId: session._id,
    req,
  });
};

exports.createPosOrder = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const { items, customerId, paymentMode, paymentBreakdown } = req.body || {};
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: "items required" });
  }

  const rawPaymentMode = String(paymentMode || "CASH").toUpperCase();
  const customer = await resolveCustomer(customerId);

  const productIds = items.map((item) => item.product).filter(Boolean);
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds }, shopId, isActive: { $ne: false } }).lean()
    : [];
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const normalizedItems = items.map((item, index) => {
    const product = item.product ? productMap.get(String(item.product)) : null;
    if (item.product && !product) {
      const error = new Error("Product is not available in this shop");
      error.statusCode = 403;
      throw error;
    }
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const price = Number(product?.price ?? item.price ?? 0);
    const name = String(item.name || product?.name || `Manual item ${index + 1}`).trim();

    if (!product && !name) {
      const error = new Error("Manual POS items require a name");
      error.statusCode = 400;
      throw error;
    }

    return {
      product: product?._id || null,
      name,
      quantity,
      price,
      costPrice: Number(product?.costPrice || 0),
    };
  });

  const inventoryItems = normalizedItems.filter((item) => item.product);
  const totalAmount = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCost = normalizedItems.reduce((sum, item) => sum + Number(item.costPrice || 0) * item.quantity, 0);
  const profit = Number((totalAmount - totalCost).toFixed(2));
  const normalizedBreakdown = normalizePaymentBreakdown(paymentBreakdown, totalAmount);
  const effectiveModes = normalizedBreakdown.length ? normalizedBreakdown.map((item) => item.mode) : [rawPaymentMode];

  if (effectiveModes.some((mode) => mode === "WALLET" || mode === "CREDIT") && !customer) {
    return res.status(400).json({ message: "Valid customerId required for wallet or credit POS payments" });
  }

  const walletAmount = normalizedBreakdown.filter((item) => item.mode === "WALLET").reduce((sum, item) => sum + item.amount, 0);
  const onlineAmount = normalizedBreakdown.filter((item) => item.mode === "ONLINE").reduce((sum, item) => sum + item.amount, 0);
  const creditAmount = normalizedBreakdown.filter((item) => item.mode === "CREDIT").reduce((sum, item) => sum + item.amount, 0);

  const derivedMode = normalizedBreakdown.length
    ? (onlineAmount > 0 ? "ONLINE" : creditAmount > 0 ? "CREDIT" : walletAmount > 0 ? "WALLET" : "CASH")
    : rawPaymentMode;
  const normalizedPaymentMode = derivedMode === "CASH" ? "COD" : derivedMode;
  const initialPaymentStatus = onlineAmount > 0 || normalizedPaymentMode === "ONLINE"
    ? "PENDING"
    : "SUCCESS";

  const order = await Order.create({
    shopId,
    user: customer?._id || req.user._id,
    customerId: customer?._id || null,
    items: normalizedItems,
    totalAmount,
    channel: "POS",
    status: "CONFIRMED",
    paymentMode: normalizedPaymentMode,
    paymentStatus: initialPaymentStatus,
    metadata: {
      paymentBreakdown: normalizedBreakdown,
      splitPayment: normalizedBreakdown.length > 1,
      cashAmount: normalizedBreakdown.filter((item) => item.mode === "CASH").reduce((sum, item) => sum + item.amount, 0),
      walletAmount,
      onlineAmount,
      creditAmount,
      finance: {
        profit: {
          grossProfit: profit,
          totalCost: Number(totalCost.toFixed(2)),
          items: normalizedItems.map((item) => ({
            productId: item.product,
            quantity: item.quantity,
            costPrice: item.costPrice,
            sellingPrice: item.price,
            profit: Number(((item.price - item.costPrice) * item.quantity).toFixed(2)),
          })),
        },
        postedAt: new Date(),
      },
    },
  });

  if (walletAmount > 0) {
    await walletService.debitCustomerWallet({
      userId: customer._id,
      globalCustomerId: customer.globalCustomerId,
      shopId,
      amount: walletAmount,
      walletType: "CASH",
      referenceId: `pos-wallet-${String(order._id)}`,
      metadata: {
        source: "merchant_pos_wallet_payment",
        orderId: order._id,
        note: "Merchant POS wallet split payment",
      },
    });
  }

  if (inventoryItems.length) {
    await inventory.createInventoryEntry({
      shopId,
      orderId: order._id,
      items: inventoryItems,
      type: "ORDER_COMMIT",
      direction: "OUT",
      referenceId: String(order._id),
      meta: { orderId: order._id },
    });
  }

  if (initialPaymentStatus === "SUCCESS" && totalAmount > 0) {
    await walletAdapter.ensureWallet(shopId);
    await createLedgerEntry({
      merchantId: shopId,
      type: "SALE",
      direction: "CREDIT",
      amount: totalAmount,
      referenceId: String(order._id),
      referenceType: "ORDER",
      status: "CONFIRMED",
      meta: {
        source: "merchant_pos_order",
        orderId: order._id,
        profit,
      },
    });
  }

  res.status(201).json({ data: order });

  await createAudit({
    action: "CREATE_POS_ORDER",
    performedBy: req.user?._id,
    targetType: "Order",
    targetId: order._id,
    req,
  });
};
