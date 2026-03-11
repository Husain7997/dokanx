const Coupon = require("./models/coupon.model");
const AutomationRule = require("./models/automationRule.model");
const AutomationExecution = require("./models/automationExecution.model");
const CouponRedemption = require("./models/couponRedemption.model");

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCouponPayload(payload = {}) {
  return {
    code: asUpper(payload.code),
    title: String(payload.title || "").trim(),
    type: asUpper(payload.type),
    value: toNumber(payload.value, 0),
    minOrderAmount: toNumber(payload.minOrderAmount, 0),
    usageLimit: toNumber(payload.usageLimit, 0),
    expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    buyXGetY: {
      buyQuantity: toNumber(payload?.buyXGetY?.buyQuantity, 1),
      getQuantity: toNumber(payload?.buyXGetY?.getQuantity, 1),
      targetProductId: payload?.buyXGetY?.targetProductId || null,
    },
  };
}

function normalizeAutomationPayload(payload = {}) {
  return {
    name: String(payload.name || "").trim(),
    trigger: asUpper(payload.trigger),
    channel: asUpper(payload.channel || "BOTH"),
    actionType: asUpper(payload.actionType || "MESSAGE"),
    delayMinutes: toNumber(payload.delayMinutes, 0),
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : true,
    template: {
      subject: String(payload?.template?.subject || "").trim(),
      body: String(payload?.template?.body || "").trim(),
    },
    audience: {
      customerTags: Array.isArray(payload?.audience?.customerTags) ? payload.audience.customerTags : [],
      minOrders: toNumber(payload?.audience?.minOrders, 0),
      inactiveDays: toNumber(payload?.audience?.inactiveDays, 0),
    },
    reward: {
      couponCode: asUpper(payload?.reward?.couponCode),
      discountValue: toNumber(payload?.reward?.discountValue, 0),
    },
  };
}

function buildAutomationPreview(rule) {
  const baseDelay = Number(rule.delayMinutes || 0);
  return {
    trigger: rule.trigger,
    channel: rule.channel,
    actionType: rule.actionType,
    executionWindow: {
      delayMinutes: baseDelay,
      humanized: baseDelay === 0 ? "immediate" : `${baseDelay} minute(s) after trigger`,
    },
    reward: rule.reward || {},
    template: rule.template || {},
  };
}

async function createCoupon({ shopId, actorId, payload }) {
  const normalized = normalizeCouponPayload(payload);
  return Coupon.create({
    shopId,
    ...normalized,
    createdBy: actorId || null,
    updatedBy: actorId || null,
  });
}

async function listCoupons({ shopId, filters = {} }) {
  const query = { shopId };
  if (filters.type) query.type = asUpper(filters.type);
  if (filters.isActive !== undefined) query.isActive = String(filters.isActive) === "true";

  const limit = Math.min(Math.max(toNumber(filters.limit, 20), 1), 100);

  return Coupon.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

async function getCouponByCode({ shopId, code }) {
  return Coupon.findOne({ shopId, code: asUpper(code) });
}

async function updateCoupon({ shopId, code, actorId, payload }) {
  const coupon = await getCouponByCode({ shopId, code });
  if (!coupon) {
    const err = new Error("Coupon not found");
    err.statusCode = 404;
    throw err;
  }

  const normalized = normalizeCouponPayload({
    ...coupon.toObject?.(),
    ...payload,
    code: coupon.code,
  });

  Object.assign(coupon, normalized, { updatedBy: actorId || null });
  await coupon.save();
  return coupon;
}

async function evaluateCoupon({ shopId, code, cartSubtotal = 0, shippingFee = 0, itemCount = 0 }) {
  const coupon = await Coupon.findOne({
    shopId,
    code: asUpper(code),
    isActive: true,
  }).lean();

  if (!coupon) {
    return { valid: false, reason: "Coupon not found" };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
    return { valid: false, reason: "Coupon expired", coupon };
  }

  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, reason: "Coupon usage limit reached", coupon };
  }

  if (Number(cartSubtotal) < Number(coupon.minOrderAmount || 0)) {
    return { valid: false, reason: "Minimum order amount not met", coupon };
  }

  const subtotal = toNumber(cartSubtotal, 0);
  const shipping = toNumber(shippingFee, 0);
  let discount = 0;

  if (coupon.type === "PERCENTAGE") {
    discount = (subtotal * Number(coupon.value || 0)) / 100;
  } else if (coupon.type === "FIXED") {
    discount = Number(coupon.value || 0);
  } else if (coupon.type === "FREE_SHIPPING") {
    discount = shipping;
  } else if (coupon.type === "BUY_X_GET_Y") {
    const buyQuantity = Number(coupon?.buyXGetY?.buyQuantity || 1);
    const getQuantity = Number(coupon?.buyXGetY?.getQuantity || 1);
    const eligibleFreeUnits = itemCount >= buyQuantity ? getQuantity : 0;
    discount = eligibleFreeUnits;
  }

  return {
    valid: true,
    coupon,
    effect: {
      type: coupon.type,
      discountValue: Number(discount),
    },
  };
}

async function createAutomationRule({ shopId, actorId, payload }) {
  const normalized = normalizeAutomationPayload(payload);
  return AutomationRule.create({
    shopId,
    ...normalized,
    createdBy: actorId || null,
    updatedBy: actorId || null,
  });
}

async function listAutomationRules({ shopId, filters = {} }) {
  const query = { shopId };
  if (filters.trigger) query.trigger = asUpper(filters.trigger);
  if (filters.enabled !== undefined) query.enabled = String(filters.enabled) === "true";

  const limit = Math.min(Math.max(toNumber(filters.limit, 20), 1), 100);
  return AutomationRule.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

async function updateAutomationRule({ shopId, ruleId, actorId, payload }) {
  const rule = await AutomationRule.findOne({ _id: ruleId, shopId });
  if (!rule) {
    const err = new Error("Automation rule not found");
    err.statusCode = 404;
    throw err;
  }

  const normalized = normalizeAutomationPayload({
    ...rule.toObject?.(),
    ...payload,
  });

  Object.assign(rule, normalized, { updatedBy: actorId || null });
  await rule.save();
  return rule;
}

async function getAutomationPreview({ shopId, ruleId }) {
  const rule = await AutomationRule.findOne({ _id: ruleId, shopId }).lean();
  if (!rule) {
    const err = new Error("Automation rule not found");
    err.statusCode = 404;
    throw err;
  }

  return buildAutomationPreview(rule);
}

function matchesAutomationAudience(rule, context = {}) {
  const minOrders = Number(rule?.audience?.minOrders || 0);
  const inactiveDays = Number(rule?.audience?.inactiveDays || 0);
  const customerOrders = Number(context.customerOrders || 0);
  const customerInactiveDays = Number(context.customerInactiveDays || 0);

  if (customerOrders < minOrders) return false;
  if (inactiveDays > 0 && customerInactiveDays < inactiveDays) return false;
  return true;
}

function buildExecutionResult(rule, context = {}) {
  const couponCode = String(rule?.reward?.couponCode || "").trim().toUpperCase();
  return {
    channel: rule.channel,
    actionType: rule.actionType,
    dispatchMode: rule.delayMinutes > 0 ? "SCHEDULED" : "IMMEDIATE",
    scheduledAfterMinutes: Number(rule.delayMinutes || 0),
    message: {
      subject: String(rule?.template?.subject || "").trim(),
      body: String(rule?.template?.body || "").trim(),
    },
    reward: {
      couponCode,
      discountValue: Number(rule?.reward?.discountValue || 0),
    },
    context,
  };
}

async function executeAutomationTrigger({ shopId, trigger, context = {} }) {
  const rules = await AutomationRule.find({
    shopId,
    trigger: asUpper(trigger),
    enabled: true,
  }).lean();

  const executions = [];
  for (const rule of rules) {
    const matched = matchesAutomationAudience(rule, context);
    const result = matched ? buildExecutionResult(rule, context) : { skippedReason: "AUDIENCE_FILTER" };
    const execution = await AutomationExecution.create({
      shopId,
      ruleId: rule._id,
      trigger: asUpper(trigger),
      status: matched ? "EXECUTED" : "SKIPPED",
      context,
      result,
    });
    executions.push(execution);
  }

  return executions;
}

async function listAutomationExecutions({ shopId, trigger = null, limit = 50 }) {
  const query = { shopId };
  if (trigger) query.trigger = asUpper(trigger);

  return AutomationExecution.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

async function consumeCouponForOrder({ shopId, order }) {
  const code = String(order?.appliedCoupon?.code || "").trim().toUpperCase();
  if (!shopId || !order?._id || !code) {
    return { consumed: false, reason: "NO_COUPON" };
  }

  const coupon = await Coupon.findOne({
    shopId,
    code,
  });

  if (!coupon) {
    return { consumed: false, reason: "COUPON_NOT_FOUND" };
  }

  const existing = await CouponRedemption.findOne({
    orderId: order._id,
    couponId: coupon._id,
  }).lean();

  if (existing) {
    return { consumed: false, reason: "ALREADY_CONSUMED", redemption: existing };
  }

  const redemption = await CouponRedemption.create({
    shopId,
    couponId: coupon._id,
    orderId: order._id,
    userId: order.user || null,
    code: coupon.code,
    discountValue: Number(order?.appliedCoupon?.discountValue || 0),
  });

  coupon.usageCount = Number(coupon.usageCount || 0) + 1;
  await coupon.save();

  return {
    consumed: true,
    coupon: {
      _id: coupon._id,
      code: coupon.code,
      usageCount: coupon.usageCount,
    },
    redemption,
  };
}

module.exports = {
  _internals: {
    normalizeCouponPayload,
    normalizeAutomationPayload,
    buildAutomationPreview,
    matchesAutomationAudience,
    buildExecutionResult,
  },
  createCoupon,
  listCoupons,
  updateCoupon,
  evaluateCoupon,
  createAutomationRule,
  listAutomationRules,
  updateAutomationRule,
  getAutomationPreview,
  executeAutomationTrigger,
  listAutomationExecutions,
  consumeCouponForOrder,
};
