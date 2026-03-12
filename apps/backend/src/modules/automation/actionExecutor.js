const crypto = require("crypto");
const Shop = require("@/models/shop.model");
const Coupon = require("@/modules/marketing/models/coupon.model");
const referralAffiliateService = require("@/modules/referral-affiliate/referralAffiliate.service");
const { enqueueNotification } = require("@/platform/notifications/notification.service");
const AutomationTask = require("./models/automationTask.model");
const LoyaltyPointLedger = require("./models/loyaltyPointLedger.model");

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function resolvePath(source, path) {
  const parts = String(path || "").split(".").filter(Boolean);
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function interpolate(template, context = {}) {
  return String(template || "").replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, token) => {
    const value = resolvePath(context, token);
    return value === undefined || value === null ? "" : String(value);
  });
}

function buildCouponCode() {
  return `AUTO${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function executeNotificationAction({ shopId, action, context }) {
  const type = asUpper(action.type);
  const subject = interpolate(action?.template?.subject || action?.subject || "", context);
  const message = interpolate(action?.template?.body || action?.message || "", context);
  const data = {
    actionType: type,
    meta: action.meta || {},
    context,
  };

  if (type === "SEND_SMS") {
    const to = String(action.to || context.customerPhone || context.phone || "").trim();
    if (!to || !message) throw new Error("SMS recipient or message missing");
    const job = await enqueueNotification({
      tenantId: shopId,
      channels: ["sms"],
      to,
      message,
      data,
      idempotencyKey: String(action.idempotencyKey || `${shopId}:${type}:${to}:${message}`).trim(),
    });
    return { channel: "sms", to, jobId: job?.id || null };
  }

  if (type === "SEND_EMAIL") {
    const to = String(action.to || context.customerEmail || context.email || "").trim();
    if (!to || !subject || !message) throw new Error("Email recipient, subject or message missing");
    const job = await enqueueNotification({
      tenantId: shopId,
      channels: ["email"],
      to,
      subject,
      message,
      data,
      idempotencyKey: String(action.idempotencyKey || `${shopId}:${type}:${to}:${subject}`).trim(),
    });
    return { channel: "email", to, jobId: job?.id || null };
  }

  if (type === "SEND_PUSH_NOTIFICATION") {
    const userId = action.userId || context.customerUserId || context.userId || null;
    if (!userId || !message) throw new Error("Push userId or message missing");
    const job = await enqueueNotification({
      tenantId: shopId,
      userId,
      channels: ["push"],
      message,
      subject,
      data,
      idempotencyKey: String(action.idempotencyKey || `${shopId}:${type}:${userId}:${subject || message}`).trim(),
    });
    return { channel: "push", userId, jobId: job?.id || null };
  }

  if (type === "NOTIFY_SHOP_OWNER") {
    const shop = await Shop.findById(shopId).populate("owner", "_id email phone");
    if (!shop?.owner?._id) throw new Error("Shop owner not found");

    const channels = [];
    if (shop.owner.email) channels.push("email");
    if (shop.owner.phone) channels.push("sms");
    channels.push("inapp");

    const job = await enqueueNotification({
      tenantId: shopId,
      userId: shop.owner._id,
      channels,
      to: shop.owner.email || shop.owner.phone || undefined,
      subject: subject || "Shop notification",
      message: message || "Automation rule triggered",
      data,
      idempotencyKey: String(action.idempotencyKey || `${shopId}:${type}:${shop.owner._id}:${subject || message}`).trim(),
    });
    return { channel: "owner", userId: shop.owner._id, jobId: job?.id || null };
  }

  throw new Error(`Unsupported notification action ${type}`);
}

async function executeCouponAction({ shopId, actorId, action, context }) {
  const code = asUpper(action?.coupon?.code || buildCouponCode());
  const title = interpolate(action?.coupon?.title || "Automation Coupon", context);
  const type = asUpper(action?.coupon?.type || "FIXED");
  const value = Number(action?.coupon?.value ?? 0);
  const minOrderAmount = Number(action?.coupon?.minOrderAmount ?? 0);
  const usageLimit = Number(action?.coupon?.usageLimit ?? 1);

  const coupon = await Coupon.create({
    shopId,
    code,
    title,
    type,
    value,
    minOrderAmount,
    usageLimit,
    isActive: true,
    createdBy: actorId || null,
    updatedBy: actorId || null,
  });

  return {
    couponId: coupon._id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
  };
}

async function executeAction({ shopId, actorId, action, context = {} }) {
  const type = asUpper(action?.type);

  if (["SEND_SMS", "SEND_EMAIL", "SEND_PUSH_NOTIFICATION", "NOTIFY_SHOP_OWNER"].includes(type)) {
    const dispatch = await executeNotificationAction({ shopId, action, context });
    return {
      type,
      status: "EXECUTED",
      dispatch,
    };
  }

  if (type === "CREATE_COUPON") {
    const coupon = await executeCouponAction({ shopId, actorId, action, context });
    return {
      type,
      status: "EXECUTED",
      coupon,
    };
  }

  if (type === "REDEEM_REFERRAL") {
    const referral = await referralAffiliateService.redeemReferral({
      shopId,
      userId: action.userId || context.userId || context.customerUserId || null,
      code: action.code || context.referralCode || "",
    });
    return {
      type,
      status: "EXECUTED",
      referral,
    };
  }

  if (type === "CREATE_AFFILIATE_COMMISSION") {
    const commission = await referralAffiliateService.createAffiliateCommission({
      shopId,
      payload: {
        affiliateUserId: action.affiliateUserId || context.affiliateUserId,
        orderId: action.orderId || context.orderId,
        orderAmount: Number(action.orderAmount ?? context.orderAmount ?? context.totalAmount ?? 0),
        commissionAmount: Number(action.commissionAmount ?? 0),
      },
    });
    return {
      type,
      status: "EXECUTED",
      commission,
    };
  }

  if (type === "CREATE_TASK") {
    const task = await AutomationTask.create({
      shopId,
      ruleId: action.ruleId || null,
      title: interpolate(action.title || action?.template?.title || "Automation Task", context),
      description: interpolate(action.description || action?.template?.body || "", context),
      assignedTo: action.assignedTo || context.assignedTo || null,
      meta: {
        actionMeta: action.meta || {},
        context,
      },
    });
    return {
      type,
      status: "EXECUTED",
      task,
    };
  }

  if (type === "ADD_LOYALTY_POINTS") {
    const ledger = await LoyaltyPointLedger.create({
      shopId,
      customerUserId: action.customerUserId || context.customerUserId || context.userId || null,
      customerPhone: String(action.customerPhone || context.customerPhone || context.phone || "").trim(),
      points: Number(action.points ?? 0),
      reason: interpolate(action.reason || "Automation loyalty reward", context),
      meta: {
        actionMeta: action.meta || {},
        context,
      },
    });
    return {
      type,
      status: "EXECUTED",
      ledger,
    };
  }

  return {
    type,
    status: "FAILED",
    error: `Unsupported action type ${type}`,
  };
}

module.exports = {
  executeAction,
  _internals: {
    interpolate,
    resolvePath,
    buildCouponCode,
  },
};
