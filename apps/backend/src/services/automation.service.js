const AutomationRule = require("../models/automationRule.model");
const Cart = require("../models/cart.model");
const MarketingMessageLog = require("../models/marketingMessageLog.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const { sendMarketingMessage } = require("./sms.service");

const THIRTY_MINUTES = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const templates = {
  abandoned: "আপনার কার্টে পণ্য রয়েছে! এখনই অর্ডার করুন।",
  thankYou: "ধন্যবাদ আপনার কেনাকাটার জন্য। আবার কেনাকাটায় আপনার জন্য স্মার্ট সাজেশন প্রস্তুত।",
  winback: "আপনার জন্য বিশেষ অফার। আজই ফিরে এসে অর্ডার করুন।",
  vip: "VIP অফার শুধুমাত্র আপনার জন্য। নতুন ডিল মিস করবেন না।",
};

const defaultRules = [
  {
    key: "default_abandoned_cart",
    name: "Abandoned cart recovery",
    event: "CART_ABANDONED",
    action: "SEND_SMS",
    templateKey: "abandoned",
    enabled: true,
    condition: ({ cart, customer }) => Boolean(cart?.items?.length && customer?.phone),
  },
  {
    key: "default_order_thank_you",
    name: "Post purchase thank you",
    event: "ORDER_DELIVERED",
    action: "SEND_SMS",
    templateKey: "thankYou",
    enabled: true,
    condition: ({ customer }) => Boolean(customer?.phone),
  },
  {
    key: "default_at_risk_winback",
    name: "At risk customer winback",
    event: "CUSTOMER_AT_RISK",
    action: "SEND_SMS",
    templateKey: "winback",
    enabled: true,
    condition: ({ customer }) => Array.isArray(customer?.tags) && customer.tags.includes("At Risk") && Boolean(customer.phone),
  },
  {
    key: "default_vip_offer",
    name: "VIP special offer",
    event: "CUSTOMER_VIP",
    action: "SEND_SMS",
    templateKey: "vip",
    enabled: true,
    condition: ({ customer }) => Array.isArray(customer?.tags) && customer.tags.includes("VIP") && Boolean(customer.phone),
  },
];

function renderTemplate(templateKey, data = {}) {
  const customerName = data.customer?.name || "Customer";
  const shopName = data.shop?.name || "DokanX";
  return String(templates[templateKey] || templates.thankYou)
    .replace(/\{customerName\}/g, customerName)
    .replace(/\{shopName\}/g, shopName);
}

async function listRules(shopId) {
  const customRules = await AutomationRule.find({
    $or: [{ shopId }, { shopId: null }],
  }).sort({ createdAt: -1 }).lean();

  return [
    ...defaultRules.map((rule) => ({
      key: rule.key,
      name: rule.name,
      event: rule.event,
      action: rule.action,
      templateKey: rule.templateKey,
      enabled: rule.enabled,
      source: "system",
    })),
    ...customRules.map((rule) => ({
      ...rule,
      key: String(rule._id),
      source: "merchant",
    })),
  ];
}

async function createRule(shopId, payload = {}) {
  return AutomationRule.create({
    shopId,
    name: String(payload.name || "Automation rule"),
    event: String(payload.event || "ORDER_DELIVERED").toUpperCase(),
    action: String(payload.action || "SEND_SMS").toUpperCase(),
    templateKey: String(payload.templateKey || "thankYou"),
    enabled: payload.enabled !== false,
    segment: payload.segment || "",
    delayMinutes: Number(payload.delayMinutes || 0),
  });
}

async function resolveCustomer(payload = {}) {
  if (payload.customer?.phone || payload.customer?.tags) return payload.customer;
  const customerId = payload.customerId || payload.order?.customerId || payload.cart?.userId;
  if (!customerId) return null;
  return User.findById(customerId).select("name phone email tags totalOrders totalSpent lastOrderAt").lean();
}

async function canSend({ to, ruleKey }) {
  if (!to) return { ok: false, reason: "missing_recipient" };
  const sinceDay = new Date(Date.now() - DAY_MS);
  const [sameRuleRecent, sentToday] = await Promise.all([
    MarketingMessageLog.findOne({
      to,
      ruleKey,
      status: "SENT",
      createdAt: { $gte: sinceDay },
    }).lean(),
    MarketingMessageLog.countDocuments({
      to,
      status: "SENT",
      createdAt: { $gte: sinceDay },
    }),
  ]);
  if (sameRuleRecent) return { ok: false, reason: "same_rule_24h" };
  if (sentToday >= 2) return { ok: false, reason: "daily_limit" };
  return { ok: true };
}

async function logMessage({ shopId, userId, to, channel, ruleKey, event, message, status, provider = "", providerId = "", reason = "" }) {
  return MarketingMessageLog.create({
    shopId,
    userId,
    to,
    channel,
    ruleKey,
    event,
    message,
    status,
    provider,
    providerId,
    reason,
  });
}

async function executeRule(rule, data) {
  const customer = await resolveCustomer(data);
  const enriched = { ...data, customer };
  const condition = rule.condition || (() => true);
  if (!condition(enriched)) return { skipped: true, reason: "condition_not_matched" };

  const to = customer?.phone;
  const channel = rule.action === "SEND_WHATSAPP" ? "whatsapp" : "sms";
  const ruleKey = rule.key || String(rule._id || `${rule.event}:${rule.templateKey}`);
  const message = renderTemplate(rule.templateKey, enriched);
  const safety = await canSend({ to, ruleKey });
  if (!safety.ok) {
    await logMessage({
      shopId: data.shopId || data.order?.shopId || data.cart?.shopId || null,
      userId: customer?._id || data.customerId || null,
      to: to || "unknown",
      channel,
      ruleKey,
      event: rule.event,
      message,
      status: "SKIPPED",
      reason: safety.reason,
    });
    return { skipped: true, reason: safety.reason };
  }

  try {
    const result = await sendMarketingMessage({ to, message, channel });
    await logMessage({
      shopId: data.shopId || data.order?.shopId || data.cart?.shopId || null,
      userId: customer?._id || data.customerId || null,
      to,
      channel,
      ruleKey,
      event: rule.event,
      message,
      status: "SENT",
      provider: result.provider || (result.skipped ? "dry-run" : ""),
      providerId: result.sid || "",
    });
    return { sent: true, provider: result.provider || "dry-run" };
  } catch (error) {
    await logMessage({
      shopId: data.shopId || data.order?.shopId || data.cart?.shopId || null,
      userId: customer?._id || data.customerId || null,
      to,
      channel,
      ruleKey,
      event: rule.event,
      message,
      status: "FAILED",
      reason: error.message,
    });
    return { failed: true, reason: error.message };
  }
}

async function processEvent(event) {
  const type = String(event?.type || "").toUpperCase();
  const payload = event?.payload || {};
  const shopId = payload.shopId || payload.order?.shopId || payload.cart?.shopId || null;
  const customRules = await AutomationRule.find({ event: type, enabled: true, $or: [{ shopId }, { shopId: null }] }).lean();
  const rules = [
    ...defaultRules.filter((rule) => rule.event === type && rule.enabled),
    ...customRules.map((rule) => ({
      ...rule,
      key: String(rule._id),
      condition: (data) => {
        if (!rule.segment) return true;
        return Array.isArray(data.customer?.tags) && data.customer.tags.includes(rule.segment);
      },
    })),
  ];

  const results = [];
  for (const rule of rules) {
    results.push(await executeRule(rule, payload));
  }
  return results;
}

function scheduleAbandonedCart(cartId, delayMs = THIRTY_MINUTES) {
  const timer = setTimeout(async () => {
    const cart = await Cart.findById(cartId).lean();
    if (!cart || !cart.items?.length) return;
    const inactiveSince = new Date(Date.now() - delayMs);
    if (cart.updatedAt && new Date(cart.updatedAt) > inactiveSince) return;
    const eventService = require("./event.service");
    eventService.emitEvent("CART_ABANDONED", { cart, customerId: cart.userId, shopId: cart.shopId });
  }, delayMs);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

async function triggerCustomerSegmentEvents(customer, shopId = null) {
  const eventService = require("./event.service");
  const tags = Array.isArray(customer?.tags) ? customer.tags : [];
  if (tags.includes("At Risk")) {
    eventService.emitEvent("CUSTOMER_AT_RISK", { customer, customerId: customer._id, shopId });
  }
  if (tags.includes("VIP")) {
    eventService.emitEvent("CUSTOMER_VIP", { customer, customerId: customer._id, shopId });
  }
}

module.exports = {
  createRule,
  defaultRules,
  listRules,
  processEvent,
  renderTemplate,
  scheduleAbandonedCart,
  templates,
  triggerCustomerSegmentEvents,
};
