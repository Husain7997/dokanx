const crypto = require("crypto");

const AuditLog = require("../models/audit.model");
const Cart = require("../models/cart.model");
const FraudCase = require("../models/fraudCase.model");
const Notification = require("../models/notification.model");
const Order = require("../models/order.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const Shop = require("../models/shop.model");
const User = require("../models/user.model");
const Wallet = require("../models/wallet.model");
const { createAudit } = require("../utils/audit.util");
const fraudAiService = require("../modules/ai-engine/fraud-ai.service");
const {
  resolveCustomerId,
  resolveShopId,
} = require("../utils/order-normalization.util");

const LEVELS = {
  SAFE: "safe",
  MEDIUM: "medium",
  HIGH: "high",
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveLevel(score) {
  if (score >= 61) return LEVELS.HIGH;
  if (score >= 31) return LEVELS.MEDIUM;
  return LEVELS.SAFE;
}

function deriveStatus(level) {
  if (level === LEVELS.HIGH) return "REVIEW_REQUIRED";
  if (level === LEVELS.MEDIUM) return "OPEN";
  return "CLEARED";
}

function buildDeviceFingerprint(context = {}) {
  const raw = context.deviceFingerprint || `${context.ip || ""}|${context.userAgent || ""}`;
  return crypto.createHash("sha1").update(String(raw)).digest("hex").slice(0, 16);
}

function normalizeStoredFingerprint(value) {
  if (!value) return null;
  const raw = String(value);
  return raw.length === 16 ? raw : buildDeviceFingerprint({ deviceFingerprint: raw });
}

function hoursBetween(date) {
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

function countRecent(rows, minutes, selector) {
  const boundary = Date.now() - minutes * 60 * 1000;
  return rows.filter((row) => {
    const raw = selector(row);
    if (!raw) return false;
    return new Date(raw).getTime() >= boundary;
  }).length;
}

function appendSignal(signals, condition, payload) {
  if (!condition) return 0;
  signals.push(payload);
  return payload.weight;
}

async function notifyAdmins(caseDoc) {
  const admins = await User.find({ role: "ADMIN" }).select("_id").lean();
  if (!admins.length) return;

  const title =
    caseDoc.level === LEVELS.HIGH
      ? "High risk fraud alert"
      : "Fraud risk alert";
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
  if (!order) {
    throw new Error("Order not found");
  }

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

function buildSummary(level, signals) {
  if (!signals.length) return "No significant fraud indicators detected.";
  const headline = signals
    .slice()
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 3)
    .map((signal) => signal.label)
    .join(", ");
  return `${level.toUpperCase()} risk triggered by ${headline}.`;
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

async function evaluateTransaction({ orderId, paymentAttemptId = null, source = "manual_check", context = {} }) {
  const normalizedContext = {
    ip: context.ip || null,
    userAgent: context.userAgent || null,
    deviceFingerprint: context.deviceFingerprint || null,
    deviceHash: buildDeviceFingerprint(context),
    couponCode: context.couponCode || null,
  };

  const { order, shop, paymentAttempts, paymentAttempt, merchantOrders, userOrders, couponCarts } =
    await loadOrderBundle(orderId, paymentAttemptId);
  const customerId = resolveCustomerId(order);
  const recentAuditSignals = await loadRecentAuditSignals(normalizedContext);

  const signals = [];
  let score = 0;
  const userProfile = order.customerId || order.customer || order.user || null;
  const userAgeHours = hoursBetween(userProfile?.createdAt);
  const recentUserOrders = countRecent(userOrders, 30, (row) => row.createdAt);
  const failedAttempts = paymentAttempts.filter((attempt) => attempt.status === "FAILED").length;
  const refundedUserOrders = userOrders.filter((row) => row.status === "REFUNDED").length;
  const refundedMerchantOrders = merchantOrders.filter((row) => row.status === "REFUNDED").length;
  const merchantRefundRate = merchantOrders.length ? refundedMerchantOrders / merchantOrders.length : 0;
  const previousOrders = userOrders.filter((row) => String(row._id) !== String(order._id));
  const averagePreviousAmount = previousOrders.length
    ? previousOrders.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0) / previousOrders.length
    : 0;
  const sameIpRecentActions = countRecent(
    recentAuditSignals.filter((row) => row.ip && row.ip === normalizedContext.ip),
    10,
    (row) => row.createdAt
  );
  const distinctActorsOnDevice = new Set(
    recentAuditSignals
      .filter((row) => {
        const rawFingerprint = row?.meta?.deviceFingerprint || row?.meta?.deviceHash || null;
        return normalizeStoredFingerprint(rawFingerprint) === normalizedContext.deviceHash;
      })
      .map((row) => String(row.performedBy || "guest"))
  ).size;
  const sameContactOrders = order.contact?.email
    ? userOrders.filter((row) => String(row.contact?.email || "").toLowerCase() === String(order.contact.email).toLowerCase()).length
    : 0;
  const couponUsage = normalizedContext.couponCode
    ? couponCarts.filter((row) => String(row.couponCode || "").toLowerCase() === String(normalizedContext.couponCode).toLowerCase()).length
    : 0;
  const attemptBurst = paymentAttempts.length;

  score += appendSignal(signals, userAgeHours < 24, {
    code: "NEW_ACCOUNT",
    label: "Very new account age",
    weight: 16,
    value: `${userAgeHours.toFixed(1)}h`,
    threshold: "<24h",
  });
  score += appendSignal(signals, recentUserOrders >= 4, {
    code: "RAPID_ORDERING",
    label: "Rapid ordering velocity",
    weight: Math.min(30, 10 + recentUserOrders * 4),
    value: recentUserOrders,
    threshold: ">=4 in 30m",
  });
  score += appendSignal(signals, failedAttempts >= 2, {
    code: "PAYMENT_FAILURES",
    label: "Multiple payment failures",
    weight: Math.min(24, failedAttempts * 8),
    value: failedAttempts,
    threshold: ">=2",
  });
  score += appendSignal(signals, order.paymentStatus === "FAILED" || order.status === "PAYMENT_FAILED", {
    code: "ORDER_PAYMENT_FAILED",
    label: "Current order has failed payment",
    weight: 22,
    value: order.paymentStatus || order.status,
    threshold: "FAILED",
  });
  score += appendSignal(
    signals,
    averagePreviousAmount > 0 && Number(order.totalAmount || 0) >= averagePreviousAmount * 2.5 && Number(order.totalAmount || 0) >= 3000,
    {
      code: "AMOUNT_SPIKE",
      label: "Order amount is significantly above normal",
      weight: 14,
      value: Number(order.totalAmount || 0),
      threshold: `${Math.round(averagePreviousAmount * 2.5)}`,
    }
  );
  score += appendSignal(signals, sameIpRecentActions >= 6, {
    code: "SAME_IP_BURST",
    label: "Heavy activity from the same IP",
    weight: 18,
    value: sameIpRecentActions,
    threshold: ">=6 in 10m",
  });
  score += appendSignal(signals, distinctActorsOnDevice >= 3, {
    code: "SHARED_DEVICE",
    label: "Device fingerprint reused across accounts",
    weight: 16,
    value: distinctActorsOnDevice,
    threshold: ">=3 accounts",
  });
  score += appendSignal(signals, refundedUserOrders >= 2, {
    code: "REFUND_HISTORY",
    label: "User has repeated refunds",
    weight: 12,
    value: refundedUserOrders,
    threshold: ">=2",
  });
  score += appendSignal(signals, merchantOrders.length >= 10 && merchantRefundRate >= 0.15, {
    code: "MERCHANT_REFUND_RATE",
    label: "Merchant refund rate is abnormally high",
    weight: 18,
    value: `${(merchantRefundRate * 100).toFixed(1)}%`,
    threshold: ">=15%",
  });
  score += appendSignal(signals, order.isGuest, {
    code: "GUEST_CHECKOUT",
    label: "Guest checkout without account history",
    weight: 8,
    value: true,
    threshold: "guest=true",
  });
  score += appendSignal(signals, sameContactOrders >= 4, {
    code: "CONTACT_REUSE",
    label: "Contact details reused in many orders",
    weight: 12,
    value: sameContactOrders,
    threshold: ">=4 orders",
  });
  score += appendSignal(signals, couponUsage >= 4, {
    code: "COUPON_REUSE",
    label: "Coupon used across multiple carts",
    weight: 15,
    value: couponUsage,
    threshold: ">=4 carts",
  });
  score += appendSignal(signals, attemptBurst >= 4, {
    code: "PAYMENT_ATTEMPT_BURST",
    label: "Too many attempts for one checkout",
    weight: 14,
    value: attemptBurst,
    threshold: ">=4 attempts",
  });
  score += appendSignal(
    signals,
    Boolean(paymentAttempt && Number(paymentAttempt.amount || 0) !== Number(order.totalAmount || 0)),
    {
      code: "PAYMENT_MISMATCH",
      label: "Payment amount does not match order value",
      weight: 18,
      value: Number(paymentAttempt?.amount || 0),
      threshold: Number(order.totalAmount || 0),
    }
  );

  const aiAssessment = await fraudAiService.getFraudSignals({
    customerId,
    shopId: resolveShopId(order),
    order,
    userOrders,
  });
  (aiAssessment.signals || []).forEach((signal) => {
    score += appendSignal(signals, true, signal);
  });

  score = clampScore(score);
  const level = deriveLevel(score);
  const recommendedActions =
    level === LEVELS.HIGH
      ? ["FLAG_TRANSACTION", "SEND_ADMIN_ALERT", "REQUIRE_MANUAL_REVIEW"]
      : level === LEVELS.MEDIUM
        ? ["FLAG_TRANSACTION", "SEND_ADMIN_ALERT"]
        : [];
  const entityType = paymentAttempt ? "payment" : "order";
  const entityId = paymentAttempt ? paymentAttempt._id : order._id;
  const caseKey = `${entityType}:${entityId}`;
  const summary = buildSummary(level, signals);
  const metrics = {
    recentUserOrders,
    failedAttempts,
    refundedUserOrders,
    merchantRefundRate: Number(merchantRefundRate.toFixed(4)),
    sameIpRecentActions,
    distinctActorsOnDevice,
    attemptBurst,
    aiFraudScore: aiAssessment.score,
  };

  const previousCase = await FraudCase.findOne({ caseKey }).lean();
  const fraudCase = await FraudCase.findOneAndUpdate(
    { caseKey },
    {
      $set: {
        entityType,
        entityId,
        orderId: order._id,
        paymentAttemptId: paymentAttempt?._id || null,
        userId: customerId || userProfile?._id || null,
        shopId: resolveShopId(order),
        score,
        level,
        status: deriveStatus(level),
        reviewRequired: level === LEVELS.HIGH,
        source,
        summary,
        signals,
        recommendedActions,
        context: normalizedContext,
        metrics,
        lastEvaluatedAt: new Date(),
      },
      $setOnInsert: {
        reviewActions: [],
      },
    },
    { upsert: true, new: true }
  ).lean();

  if (level === LEVELS.HIGH) {
    await Order.findByIdAndUpdate(order._id, {
      disputeStatus: "IN_REVIEW",
      disputeReason: "FRAUD",
      adminNotes: "Fraud system flagged this transaction for manual review.",
    });
  }

  const shouldAlert =
    (level === LEVELS.MEDIUM || level === LEVELS.HIGH) &&
    (!previousCase ||
      previousCase.level !== level ||
      Math.abs(Number(previousCase.score || 0) - score) >= 15);

  if (shouldAlert) {
    await notifyAdmins(fraudCase);
  }

  return fraudCase;
}

async function getOverview() {
  const [cases, totalOrders, totalAttempts, failedAttempts, blockedUsers, suspendedMerchants, frozenWallets] =
    await Promise.all([
      FraudCase.find().sort({ updatedAt: -1 }).limit(250).lean(),
      Order.countDocuments(),
      PaymentAttempt.countDocuments(),
      PaymentAttempt.countDocuments({ status: "FAILED" }),
      User.countDocuments({ isBlocked: true }),
      Shop.countDocuments({ isActive: false }),
      Wallet.countDocuments({ isFrozen: true }),
    ]);

  const orderCases = cases.filter((item) => item.entityType === "order");
  const openCases = cases.filter((item) => item.status !== "CLEARED" && item.status !== "DISMISSED");
  const alerts = openCases
    .filter((item) => item.level === LEVELS.HIGH || item.level === LEVELS.MEDIUM)
    .slice(0, 12);

  const suspiciousUsers = Array.from(
    orderCases.reduce((map, item) => {
      const key = String(item.userId || "");
      if (!key) return map;
      const current = map.get(key) || {
        userId: item.userId,
        score: 0,
        orderCount: 0,
        latestCaseAt: item.updatedAt,
      };
      current.score = Math.max(current.score, Number(item.score || 0));
      current.orderCount += 1;
      current.latestCaseAt = item.updatedAt > current.latestCaseAt ? item.updatedAt : current.latestCaseAt;
      map.set(key, current);
      return map;
    }, new Map()).values()
  )
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);

  const highRiskMerchants = Array.from(
    orderCases.reduce((map, item) => {
      const key = String(item.shopId || "");
      if (!key) return map;
      const current = map.get(key) || {
        shopId: item.shopId,
        score: 0,
        caseCount: 0,
        latestCaseAt: item.updatedAt,
      };
      current.score = Math.max(current.score, Number(item.score || 0));
      current.caseCount += 1;
      current.latestCaseAt = item.updatedAt > current.latestCaseAt ? item.updatedAt : current.latestCaseAt;
      map.set(key, current);
      return map;
    }, new Map()).values()
  )
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);

  const signalFrequency = {};
  openCases.forEach((item) => {
    (item.signals || []).forEach((signal) => {
      const code = String(signal.code || "UNKNOWN");
      signalFrequency[code] = (signalFrequency[code] || 0) + 1;
    });
  });

  return enrichOverview({
    summary: {
      cases: cases.length,
      openCases: openCases.length,
      reviewRequired: cases.filter((item) => item.status === "REVIEW_REQUIRED").length,
      blockedUsers,
      suspendedMerchants,
      frozenWallets,
      fraudRate: totalOrders ? Number(((orderCases.length / totalOrders) * 100).toFixed(2)) : 0,
      paymentFailureRate: totalAttempts ? Number(((failedAttempts / totalAttempts) * 100).toFixed(2)) : 0,
    },
    flaggedOrders: orderCases.slice(0, 12),
    suspiciousUsers,
    highRiskMerchants,
    alerts,
    analytics: {
      totalOrders,
      totalAttempts,
      failedAttempts,
      topSignals: Object.entries(signalFrequency)
        .sort((left, right) => Number(right[1]) - Number(left[1]))
        .slice(0, 8)
        .map(([code, count]) => ({ code, count })),
    },
  });
}

async function getAlerts() {
  return FraudCase.find({
    status: { $in: ["OPEN", "REVIEW_REQUIRED", "INVESTIGATING"] },
    level: { $in: [LEVELS.MEDIUM, LEVELS.HIGH] },
  })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();
}

async function getReports() {
  const overview = await getOverview();
  return overview.analytics;
}

async function reviewCase({ caseId, action, note = "", adminId = null, req = null }) {
  const fraudCase = await FraudCase.findById(caseId);
  if (!fraudCase) {
    throw new Error("Fraud case not found");
  }

  if (action === "APPROVE") {
    fraudCase.status = "DISMISSED";
    if (fraudCase.orderId) {
      await Order.findByIdAndUpdate(fraudCase.orderId, {
        disputeStatus: "NONE",
        disputeReason: "NONE",
        adminNotes: note || "Fraud review approved by admin.",
      });
    }
  }

  if (action === "INVESTIGATE") {
    fraudCase.status = "INVESTIGATING";
  }

  if (action === "BLOCK_USER" && fraudCase.userId) {
    await User.findByIdAndUpdate(fraudCase.userId, { isBlocked: true });
    fraudCase.status = "ACTION_TAKEN";
  }

  if (action === "SUSPEND_MERCHANT" && fraudCase.shopId) {
    await Shop.findByIdAndUpdate(fraudCase.shopId, { isActive: false });
    fraudCase.status = "ACTION_TAKEN";
  }

  if (action === "FREEZE_WALLET" && fraudCase.shopId) {
    await Wallet.findOneAndUpdate(
      { shopId: fraudCase.shopId },
      { isFrozen: true, status: "FROZEN" },
      { upsert: true }
    );
    fraudCase.status = "ACTION_TAKEN";
  }

  fraudCase.reviewNote = note;
  fraudCase.lastReviewedAt = new Date();
  fraudCase.reviewedBy = adminId;
  fraudCase.reviewActions.push({ action, note });
  await fraudCase.save();

  await createAudit({
    action: "FRAUD_CASE_REVIEWED",
    performedBy: adminId,
    targetType: "FraudCase",
    targetId: fraudCase._id,
    req,
    meta: {
      action,
      note,
      status: fraudCase.status,
      orderId: fraudCase.orderId,
      userId: fraudCase.userId,
      shopId: fraudCase.shopId,
    },
  });

  return fraudCase.toObject();
}

async function evaluateWarrantyClaim({ orderId, productId, customerId, shopId, flags = [], source = "warranty_claim" }) {
  const aiClaimSignals = await fraudAiService.getClaimFraudSignals({ customerId, shopId, productId });
  const combinedFlags = [...new Set([...(flags || []), ...(aiClaimSignals.flags || [])])];
  if (!combinedFlags.length) return null;

  const caseKey = `warranty:${orderId}:${productId}:${customerId}`;
  return FraudCase.findOneAndUpdate(
    { caseKey },
    {
      $set: {
        caseKey,
        entityType: "warranty_claim",
        entityId: `${orderId}:${productId}`,
        orderId,
        userId: customerId,
        shopId,
        score: clampScore(combinedFlags.length * 18 + Number(aiClaimSignals.score || 0)),
        level: combinedFlags.length >= 3 ? LEVELS.HIGH : LEVELS.MEDIUM,
        status: combinedFlags.length >= 3 ? "REVIEW_REQUIRED" : "OPEN",
        reviewRequired: combinedFlags.length >= 3,
        source,
        summary: `Warranty claim risk triggered by ${combinedFlags.join(", ")}.`,
        signals: combinedFlags.map((flag) => ({
          code: flag.toUpperCase(),
          label: flag.replace(/_/g, " "),
          weight: 18,
          value: true,
          threshold: "claim-abuse",
        })),
        recommendedActions: ["FLAG_TRANSACTION", "SEND_ADMIN_ALERT"],
        context: {
          productId,
          customerId,
        },
        metrics: {
          flagCount: combinedFlags.length,
          aiFraudScore: aiClaimSignals.score,
        },
        lastEvaluatedAt: new Date(),
      },
      $setOnInsert: {
        reviewActions: [],
      },
    },
    { upsert: true, new: true }
  ).lean();
}

module.exports = {
  evaluateTransaction,
  evaluateWarrantyClaim,
  getOverview,
  getAlerts,
  getReports,
  reviewCase,
};
