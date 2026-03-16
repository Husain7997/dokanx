const PosSession = require("../models/posSession.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const inventory = require("../inventory");
const { createAudit } = require("../utils/audit.util");

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

  const { items } = req.body || {};
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: "items required" });
  }

  const productIds = items.map((item) => item.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const normalizedItems = items.map((item) => {
    const product = productMap.get(String(item.product));
    return {
      product: item.product,
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Number(product?.price ?? item.price ?? 0),
    };
  });

  const totalAmount = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order = await Order.create({
    shopId,
    user: req.user._id,
    items: normalizedItems,
    totalAmount,
    channel: "POS",
  });

  await inventory.createInventoryEntry({
    shopId,
    orderId: order._id,
    items: normalizedItems,
    type: "SALE",
    direction: "OUT",
  });

  res.status(201).json({ data: order });

  await createAudit({
    action: "CREATE_POS_ORDER",
    performedBy: req.user?._id,
    targetType: "Order",
    targetId: order._id,
    req,
  });
};
