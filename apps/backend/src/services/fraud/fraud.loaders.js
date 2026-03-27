const AuditLog = require("../../models/audit.model");
const Cart = require("../../models/cart.model");
const Notification = require("../../models/notification.model");
const Order = require("../../models/order.model");
const PaymentAttempt = require("../../models/paymentAttempt.model");
const Shop = require("../../models/shop.model");
const User = require("../../models/user.model");

const {
  resolveCustomerId,
  resolveShopId,
} = require("../../utils/order-normalization.util");
const { LEVELS, normalizeStoredFingerprint } = require("./fraud.utils");

async function notifyAdmins(caseDoc) {
  const admins = await User.find({ role: "ADMIN" }).select("_id").lean();
  if (!admins.length) return;

  const title = caseDoc.level === LEVELS.HIGH ? "High risk fraud alert" : "Fraud risk alert";
  const message = `${String(caseDoc.entityType).toUpperCase()} ${String(caseDoc.entityId).slice(-6)} scored ${caseDoc.score}/100.`;

  await Notification.insertMany(
    admins.map((admin) => ({
      userId: admin._id,
      title,
      message,
      type: "FRAUD_ALERT",
      metadata: {
        fraudCaseId: caseDoc._id,
        entityType: caseDoc.entityType,
        entityId: caseDoc.entityId,
        score: caseDoc.score,
        level: caseDoc.level,
      },
    }))
  );
}

async function loadOrderBundle(orderId, paymentAttemptId) {
  const order = await Order.findById(orderId)
    .populate("user customer customerId", "name email createdAt isBlocked")
    .lean();
  if (!order) throw new Error("Order not found");

  const shopId = resolveShopId(order);
  const customerId = resolveCustomerId(order);
  const [shop, paymentAttempts, merchantOrders, userOrders, couponCarts] = await Promise.all([
    shopId ? Shop.findById(shopId).select("name owner isActive createdAt").lean() : null,
    PaymentAttempt.find({ order: order._id }).sort({ createdAt: -1 }).lean(),
    shopId ? Order.find({ shopId }).select("status createdAt user totalAmount paymentStatus").lean() : [],
    customerId
      ? Order.find({ $or: [{ customerId }, { customer: customerId }, { user: customerId }] })
          .select("status createdAt totalAmount contact")
          .lean()
      : [],
    Cart.find({ shopId, couponCode: { $ne: null } }).select("couponCode userId guestToken updatedAt").lean(),
  ]);

  const paymentAttempt =
    paymentAttemptId ? paymentAttempts.find((item) => String(item._id) === String(paymentAttemptId)) || null : null;

  return { order, shop, paymentAttempts, paymentAttempt, merchantOrders, userOrders, couponCarts };
}

async function loadRecentAuditSignals(context = {}) {
  const query = [];
  if (context.ip) query.push({ ip: context.ip });
  if (context.userAgent) query.push({ userAgent: context.userAgent });
  if (!query.length) return [];

  return AuditLog.find({
    $or: query,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
}

async function enrichOverview(data) {
  const cases = [...(data.flaggedOrders || []), ...(data.alerts || [])];
  const userIds = new Set();
  const shopIds = new Set();

  cases.forEach((item) => {
    if (item.userId) userIds.add(String(item.userId));
    if (item.shopId) shopIds.add(String(item.shopId));
  });
  (data.suspiciousUsers || []).forEach((item) => {
    if (item.userId) userIds.add(String(item.userId));
  });
  (data.highRiskMerchants || []).forEach((item) => {
    if (item.shopId) shopIds.add(String(item.shopId));
  });

  const [users, shops] = await Promise.all([
    userIds.size ? User.find({ _id: { $in: Array.from(userIds) } }).select("name email").lean() : [],
    shopIds.size ? Shop.find({ _id: { $in: Array.from(shopIds) } }).select("name slug").lean() : [],
  ]);

  const userMap = new Map(users.map((user) => [String(user._id), user.name || user.email || String(user._id).slice(-6)]));
  const shopMap = new Map(shops.map((shop) => [String(shop._id), shop.name || shop.slug || String(shop._id).slice(-6)]));

  return {
    ...data,
    flaggedOrders: (data.flaggedOrders || []).map((item) => ({
      ...item,
      userName: item.userId ? userMap.get(String(item.userId)) || null : null,
      shopName: item.shopId ? shopMap.get(String(item.shopId)) || null : null,
    })),
    alerts: (data.alerts || []).map((item) => ({
      ...item,
      userName: item.userId ? userMap.get(String(item.userId)) || null : null,
      shopName: item.shopId ? shopMap.get(String(item.shopId)) || null : null,
    })),
    suspiciousUsers: (data.suspiciousUsers || []).map((item) => ({
      ...item,
      userName: item.userId ? userMap.get(String(item.userId)) || null : null,
    })),
    highRiskMerchants: (data.highRiskMerchants || []).map((item) => ({
      ...item,
      shopName: item.shopId ? shopMap.get(String(item.shopId)) || null : null,
    })),
  };
}

function getDistinctActorsOnDevice(recentAuditSignals, deviceHash) {
  return new Set(
    recentAuditSignals
      .filter((row) => {
        const rawFingerprint = row?.meta?.deviceFingerprint || row?.meta?.deviceHash || null;
        return normalizeStoredFingerprint(rawFingerprint) === deviceHash;
      })
      .map((row) => String(row.performedBy || "guest"))
  ).size;
}

module.exports = {
  notifyAdmins,
  loadOrderBundle,
  loadRecentAuditSignals,
  enrichOverview,
  getDistinctActorsOnDevice,
};
