const Plan = require("./plan.model");
const Subscription = require("./subscription.model");
const CommissionRule = require("./commissionRule.model");
const PaymentRoutingRule = require("./paymentRoutingRule.model");
const SmsPack = require("./smsPack.model");

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mergeFeatureFlags(plan = {}, overrides = {}) {
  return {
    ...(plan.features || {}),
    ...(overrides || {}),
  };
}

function resolveSubscriptionPlanShape(subscription) {
  if (!subscription) return null;

  const plan = subscription.plan || {};
  return {
    subscriptionId: subscription._id,
    tenantId: subscription.tenant,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd || null,
    plan: {
      _id: plan._id,
      code: plan.code || "",
      name: plan.name || "",
      monthlyFee: subscription.overrides?.monthlyFee ?? plan.monthlyFee ?? plan.price ?? 0,
      commissionRate: subscription.overrides?.commissionRate ?? plan.commissionRate ?? 0,
      smsQuota: subscription.overrides?.smsQuota ?? plan.smsQuota ?? 0,
      limits: plan.limits || {},
      features: mergeFeatureFlags(plan, subscription.overrides?.features),
      metadata: plan.metadata || {},
    },
    overrides: subscription.overrides || {},
  };
}

async function getTenantPlan(tenantId) {
  const subscription = await Subscription.findOne({ tenant: tenantId }).populate("plan");
  return resolveSubscriptionPlanShape(subscription);
}

async function listPlans({ activeOnly = false } = {}) {
  const query = activeOnly ? { isActive: true } : {};
  return Plan.find(query).sort({ monthlyFee: 1, createdAt: 1 }).lean();
}

async function createPlan(payload) {
  return Plan.create({
    code: String(payload.code || "").trim().toUpperCase(),
    name: String(payload.name || "").trim(),
    description: String(payload.description || "").trim(),
    price: toNumber(payload.price, toNumber(payload.monthlyFee, 0)),
    monthlyFee: toNumber(payload.monthlyFee, toNumber(payload.price, 0)),
    commissionRate: toNumber(payload.commissionRate, 0),
    smsQuota: toNumber(payload.smsQuota, 0),
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    limits: {
      shops: toNumber(payload?.limits?.shops, 1),
      products: toNumber(payload?.limits?.products, 0),
      ordersPerMonth: toNumber(payload?.limits?.ordersPerMonth, 0),
      staff: toNumber(payload?.limits?.staff, 0),
      warehouses: toNumber(payload?.limits?.warehouses, 0),
    },
    features: {
      analytics: Boolean(payload?.features?.analytics),
      autoSettlement: Boolean(payload?.features?.autoSettlement),
      prioritySupport: Boolean(payload?.features?.prioritySupport),
      pos: Boolean(payload?.features?.pos),
      reports: Boolean(payload?.features?.reports),
      marketing: Boolean(payload?.features?.marketing),
      customDomain: Boolean(payload?.features?.customDomain),
      whiteLabel: Boolean(payload?.features?.whiteLabel),
    },
    metadata: payload.metadata || {},
  });
}

async function updatePlan(planId, payload) {
  const plan = await Plan.findById(planId);
  if (!plan) {
    const err = new Error("Plan not found");
    err.statusCode = 404;
    throw err;
  }

  if (payload.code !== undefined) plan.code = String(payload.code || "").trim().toUpperCase();
  if (payload.name !== undefined) plan.name = String(payload.name || "").trim();
  if (payload.description !== undefined) plan.description = String(payload.description || "").trim();
  if (payload.price !== undefined) plan.price = toNumber(payload.price, plan.price);
  if (payload.monthlyFee !== undefined) plan.monthlyFee = toNumber(payload.monthlyFee, plan.monthlyFee);
  if (payload.commissionRate !== undefined) plan.commissionRate = toNumber(payload.commissionRate, plan.commissionRate);
  if (payload.smsQuota !== undefined) plan.smsQuota = toNumber(payload.smsQuota, plan.smsQuota);
  if (payload.isActive !== undefined) plan.isActive = Boolean(payload.isActive);
  if (payload.limits) {
    plan.limits = {
      ...(plan.limits || {}),
      ...payload.limits,
    };
  }
  if (payload.features) {
    plan.features = {
      ...(plan.features || {}),
      ...payload.features,
    };
  }
  if (payload.metadata !== undefined) plan.metadata = payload.metadata || {};

  await plan.save();
  return plan;
}

async function deletePlan(planId) {
  const deleted = await Plan.findByIdAndDelete(planId);
  if (!deleted) {
    const err = new Error("Plan not found");
    err.statusCode = 404;
    throw err;
  }
  return deleted;
}

async function assignSubscription(payload) {
  const plan = await Plan.findById(payload.planId);
  if (!plan) {
    const err = new Error("Plan not found");
    err.statusCode = 404;
    throw err;
  }

  const subscription = await Subscription.findOneAndUpdate(
    { tenant: payload.tenantId },
    {
      $set: {
        plan: payload.planId,
        status: asUpper(payload.status || "ACTIVE"),
        currentPeriodEnd: payload.currentPeriodEnd ? new Date(payload.currentPeriodEnd) : null,
        overrides: payload.overrides || {},
        metadata: payload.metadata || {},
      },
      $setOnInsert: {
        tenant: payload.tenantId,
      },
    },
    { upsert: true, new: true }
  ).populate("plan");

  return resolveSubscriptionPlanShape(subscription);
}

async function listSubscriptions() {
  const rows = await Subscription.find().populate("plan").sort({ createdAt: -1 });
  return rows.map(resolveSubscriptionPlanShape);
}

async function createCommissionRule(payload) {
  return CommissionRule.create({
    name: String(payload.name || "").trim(),
    shopId: payload.shopId || null,
    planId: payload.planId || null,
    orderChannel: asUpper(payload.orderChannel || "ONLINE"),
    rate: toNumber(payload.rate, 0),
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : true,
    priority: toNumber(payload.priority, 100),
    metadata: payload.metadata || {},
  });
}

async function listCommissionRules() {
  return CommissionRule.find().sort({ priority: 1, createdAt: -1 }).lean();
}

async function updateCommissionRule(ruleId, payload) {
  const rule = await CommissionRule.findById(ruleId);
  if (!rule) {
    const err = new Error("Commission rule not found");
    err.statusCode = 404;
    throw err;
  }

  if (payload.name !== undefined) rule.name = String(payload.name || "").trim();
  if (payload.shopId !== undefined) rule.shopId = payload.shopId || null;
  if (payload.planId !== undefined) rule.planId = payload.planId || null;
  if (payload.orderChannel !== undefined) rule.orderChannel = asUpper(payload.orderChannel);
  if (payload.rate !== undefined) rule.rate = toNumber(payload.rate, rule.rate);
  if (payload.enabled !== undefined) rule.enabled = Boolean(payload.enabled);
  if (payload.priority !== undefined) rule.priority = toNumber(payload.priority, rule.priority);
  if (payload.metadata !== undefined) rule.metadata = payload.metadata || {};

  await rule.save();
  return rule;
}

async function deleteCommissionRule(ruleId) {
  const deleted = await CommissionRule.findByIdAndDelete(ruleId);
  if (!deleted) {
    const err = new Error("Commission rule not found");
    err.statusCode = 404;
    throw err;
  }
  return deleted;
}

async function createPaymentRoutingRule(payload) {
  return PaymentRoutingRule.create({
    name: String(payload.name || "").trim(),
    shopId: payload.shopId || null,
    planId: payload.planId || null,
    priority: toNumber(payload.priority, 100),
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : true,
    condition: {
      orderChannel: asUpper(payload?.condition?.orderChannel || "ONLINE"),
      paymentMethod: asUpper(payload?.condition?.paymentMethod || "ALL"),
      hasOwnGateway: payload?.condition?.hasOwnGateway ?? null,
    },
    destination: asUpper(payload.destination),
    gatewayKey: asUpper(payload.gatewayKey || ""),
    metadata: payload.metadata || {},
  });
}

async function listPaymentRoutingRules() {
  return PaymentRoutingRule.find().sort({ priority: 1, createdAt: -1 }).lean();
}

async function updatePaymentRoutingRule(ruleId, payload) {
  const rule = await PaymentRoutingRule.findById(ruleId);
  if (!rule) {
    const err = new Error("Payment routing rule not found");
    err.statusCode = 404;
    throw err;
  }

  if (payload.name !== undefined) rule.name = String(payload.name || "").trim();
  if (payload.shopId !== undefined) rule.shopId = payload.shopId || null;
  if (payload.planId !== undefined) rule.planId = payload.planId || null;
  if (payload.priority !== undefined) rule.priority = toNumber(payload.priority, rule.priority);
  if (payload.enabled !== undefined) rule.enabled = Boolean(payload.enabled);
  if (payload.condition) {
    rule.condition = {
      ...(rule.condition || {}),
      ...(payload.condition.orderChannel !== undefined
        ? { orderChannel: asUpper(payload.condition.orderChannel) }
        : {}),
      ...(payload.condition.paymentMethod !== undefined
        ? { paymentMethod: asUpper(payload.condition.paymentMethod) }
        : {}),
      ...(payload.condition.hasOwnGateway !== undefined
        ? { hasOwnGateway: payload.condition.hasOwnGateway }
        : {}),
    };
  }
  if (payload.destination !== undefined) rule.destination = asUpper(payload.destination);
  if (payload.gatewayKey !== undefined) rule.gatewayKey = asUpper(payload.gatewayKey || "");
  if (payload.metadata !== undefined) rule.metadata = payload.metadata || {};

  await rule.save();
  return rule;
}

async function deletePaymentRoutingRule(ruleId) {
  const deleted = await PaymentRoutingRule.findByIdAndDelete(ruleId);
  if (!deleted) {
    const err = new Error("Payment routing rule not found");
    err.statusCode = 404;
    throw err;
  }
  return deleted;
}

async function createSmsPack(payload) {
  return SmsPack.create({
    code: String(payload.code || "").trim().toUpperCase(),
    name: String(payload.name || "").trim(),
    credits: toNumber(payload.credits, 0),
    price: toNumber(payload.price, 0),
    autoRechargeEligible: Boolean(payload.autoRechargeEligible),
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    metadata: payload.metadata || {},
  });
}

async function listSmsPacks({ activeOnly = false } = {}) {
  const query = activeOnly ? { isActive: true } : {};
  return SmsPack.find(query).sort({ price: 1, credits: 1 }).lean();
}

async function updateSmsPack(packId, payload) {
  const pack = await SmsPack.findById(packId);
  if (!pack) {
    const err = new Error("SMS pack not found");
    err.statusCode = 404;
    throw err;
  }

  if (payload.code !== undefined) pack.code = String(payload.code || "").trim().toUpperCase();
  if (payload.name !== undefined) pack.name = String(payload.name || "").trim();
  if (payload.credits !== undefined) pack.credits = toNumber(payload.credits, pack.credits);
  if (payload.price !== undefined) pack.price = toNumber(payload.price, pack.price);
  if (payload.autoRechargeEligible !== undefined) pack.autoRechargeEligible = Boolean(payload.autoRechargeEligible);
  if (payload.isActive !== undefined) pack.isActive = Boolean(payload.isActive);
  if (payload.metadata !== undefined) pack.metadata = payload.metadata || {};

  await pack.save();
  return pack;
}

async function deleteSmsPack(packId) {
  const deleted = await SmsPack.findByIdAndDelete(packId);
  if (!deleted) {
    const err = new Error("SMS pack not found");
    err.statusCode = 404;
    throw err;
  }
  return deleted;
}

async function previewCommission({ tenantId, orderChannel = "ONLINE", orderAmount = 0 }) {
  const subscription = await Subscription.findOne({ tenant: tenantId }).populate("plan");
  const planId = subscription?.plan?._id || subscription?.plan || null;

  const rules = await CommissionRule.find({
    enabled: true,
    $or: [{ shopId: tenantId }, { planId }, { shopId: null, planId: null }],
    orderChannel: { $in: [asUpper(orderChannel), "ALL"] },
  })
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const selectedRule = rules[0] || null;
  const rate = selectedRule
    ? toNumber(selectedRule.rate, 0)
    : subscription?.overrides?.commissionRate ?? subscription?.plan?.commissionRate ?? 0;

  return {
    tenantId,
    orderChannel: asUpper(orderChannel),
    orderAmount: toNumber(orderAmount, 0),
    rate,
    commissionAmount: (toNumber(orderAmount, 0) * rate) / 100,
    source: selectedRule ? "RULE" : "PLAN",
    rule: selectedRule,
  };
}

async function previewPaymentRouting({
  tenantId,
  orderChannel = "ONLINE",
  paymentMethod = "ALL",
  hasOwnGateway = false,
}) {
  const subscription = await Subscription.findOne({ tenant: tenantId }).populate("plan");
  const planId = subscription?.plan?._id || subscription?.plan || null;

  const rules = await PaymentRoutingRule.find({
    enabled: true,
    $or: [{ shopId: tenantId }, { planId }, { shopId: null, planId: null }],
  })
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const selected = rules.find(rule => {
    const channelOk = [asUpper(orderChannel), "ALL"].includes(asUpper(rule?.condition?.orderChannel || "ALL"));
    const methodOk = ["ALL", asUpper(paymentMethod)].includes(asUpper(rule?.condition?.paymentMethod || "ALL"));
    const gatewayOk =
      rule?.condition?.hasOwnGateway === null ||
      rule?.condition?.hasOwnGateway === undefined ||
      Boolean(rule.condition.hasOwnGateway) === Boolean(hasOwnGateway);
    return channelOk && methodOk && gatewayOk;
  });

  if (selected) {
    return {
      tenantId,
      destination: selected.destination,
      gatewayKey: selected.gatewayKey || "",
      source: "RULE",
      rule: selected,
    };
  }

  return {
    tenantId,
    destination: hasOwnGateway ? "MERCHANT_DIRECT" : "PLATFORM_WALLET",
    gatewayKey: "",
    source: "DEFAULT",
    rule: null,
  };
}

module.exports = {
  getTenantPlan,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  assignSubscription,
  listSubscriptions,
  createCommissionRule,
  listCommissionRules,
  updateCommissionRule,
  deleteCommissionRule,
  createPaymentRoutingRule,
  listPaymentRoutingRules,
  updatePaymentRoutingRule,
  deletePaymentRoutingRule,
  createSmsPack,
  listSmsPacks,
  updateSmsPack,
  deleteSmsPack,
  previewCommission,
  previewPaymentRouting,
};
