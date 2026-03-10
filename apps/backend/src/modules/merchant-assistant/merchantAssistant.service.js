const Order = require("@/models/order.model");
const Product = require("@/models/product.model");
const Payout = require("@/models/payout.model");
const BehaviorSignal = require("@/modules/behavior/behaviorSignal.model");
const ContactRequest = require("./models/contactRequest.model");

function normalizeBanglaDigits(input = "") {
  const map = {
    "০": "0",
    "১": "1",
    "২": "2",
    "৩": "3",
    "৪": "4",
    "৫": "5",
    "৬": "6",
    "৭": "7",
    "৮": "8",
    "৯": "9",
  };
  return String(input || "")
    .split("")
    .map(ch => map[ch] || ch)
    .join("");
}

function normalizeMessage(input = "") {
  return normalizeBanglaDigits(input)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function detectIntent(rawMessage = "") {
  const msg = normalizeMessage(rawMessage);
  if (!msg) return "HELP";

  if (/(আজ|today|aj)/.test(msg) && /(বিক্রি|sale|sales|revenue)/.test(msg)) {
    return "SALES_TODAY";
  }
  if (/(লো স্টক|কম স্টক|low stock|stockout|stock out)/.test(msg)) {
    return "LOW_STOCK";
  }
  if (/(pending|অপেক্ষমাণ|order|অর্ডার)/.test(msg)) {
    return "PENDING_ORDERS";
  }
  if (/(টপ প্রোডাক্ট|best seller|top product|বেশি বিক্রি)/.test(msg)) {
    return "TOP_PRODUCT_WEEK";
  }
  if (/(payout|পেআউট|settlement|সেটেলমেন্ট)/.test(msg)) {
    return "PAYOUT_STATUS";
  }
  if (/(risk|ঝুঁকি|fraud|প্রতারণা|credit)/.test(msg)) {
    return "RISK_ALERTS";
  }
  if (/(contact|যোগাযোগ|support|ticket|admin|staff|callback|call me|help desk)/.test(msg)) {
    return "CONTACT_SUPPORT";
  }
  return "HELP";
}

function detectContactTarget(rawMessage = "") {
  const msg = normalizeMessage(rawMessage);
  if (/(admin|owner|ম্যানেজার|manager)/.test(msg)) return "ADMIN";
  if (/(staff|employee|স্টাফ)/.test(msg)) return "STAFF";
  return "SUPPORT";
}

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function dayStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getTodaySales({ shopId, now = new Date() }) {
  const start = dayStart(now);
  const rows = await Order.aggregate([
    {
      $match: {
        shopId,
        status: { $in: ["CONFIRMED", "SHIPPED", "DELIVERED"] },
        createdAt: { $gte: start, $lte: now },
      },
    },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  const row = rows[0] || { orderCount: 0, revenue: 0 };
  return {
    orderCount: Number(row.orderCount || 0),
    revenue: Number(row.revenue || 0),
  };
}

async function getLowStock({ shopId, threshold = 10, limit = 5 }) {
  const safeThreshold = Math.max(Number(threshold) || 10, 0);
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
  const rows = await Product.find({
    shopId,
    isActive: true,
    stock: { $lte: safeThreshold },
  })
    .sort({ stock: 1, updatedAt: -1 })
    .limit(safeLimit)
    .select("_id name stock brand")
    .lean();

  return rows.map(r => ({
    productId: r._id,
    name: r.name,
    stock: Number(r.stock || 0),
    brand: r.brand || "",
  }));
}

async function getPendingOrders({ shopId }) {
  const count = await Order.countDocuments({
    shopId,
    status: { $in: ["PLACED", "PAYMENT_PENDING"] },
  });
  return Number(count || 0);
}

async function getTopProductWeek({ shopId, now = new Date() }) {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    {
      $match: {
        shopId,
        status: { $in: ["CONFIRMED", "SHIPPED", "DELIVERED"] },
        createdAt: { $gte: since, $lte: now },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        soldQty: { $sum: "$items.quantity" },
      },
    },
    { $sort: { soldQty: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        productId: "$product._id",
        name: "$product.name",
        soldQty: 1,
      },
    },
  ]);
  return rows[0] || null;
}

async function getPayoutStatus({ shopId, now = new Date() }) {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rows = await Payout.aggregate([
    {
      $match: {
        shopId,
        createdAt: { $gte: since, $lte: now },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const statusMap = new Map(rows.map(r => [String(r._id || "UNKNOWN"), r]));
  const success = statusMap.get("SUCCESS") || { count: 0, totalAmount: 0 };
  const failed = statusMap.get("FAILED") || { count: 0, totalAmount: 0 };
  const pending = (statusMap.get("PENDING")?.count || 0) + (statusMap.get("PROCESSING")?.count || 0);

  return {
    successCount: Number(success.count || 0),
    failedCount: Number(failed.count || 0),
    pendingCount: Number(pending || 0),
    successAmount: Number(success.totalAmount || 0),
  };
}

async function getRiskAlerts({ shopId, limit = 3 }) {
  const rows = await BehaviorSignal.find({
    shop: shopId,
    resolved: false,
    severity: { $in: ["HIGH", "MEDIUM"] },
  })
    .sort({ score: -1, createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 3, 1), 10))
    .select("severity score message signalType createdAt")
    .lean();

  return rows.map(r => ({
    severity: r.severity,
    score: Number(r.score || 0),
    signalType: r.signalType,
    message: r.message,
    createdAt: r.createdAt,
  }));
}

function buildContactActionProposal({
  rawMessage = "",
  channel = "WHATSAPP",
}) {
  const target = detectContactTarget(rawMessage);
  const summary = String(rawMessage || "").trim().slice(0, 240);

  return {
    mode: "QUEUED_DRAFT",
    queueType: "ASSISTANT_CONTACT_REQUEST",
    targetRole: target,
    channel: String(channel || "WHATSAPP").toUpperCase(),
    actionTitle: `Contact request for ${target}`,
    draftPayload: {
      subject: "Merchant contact request",
      summary: summary || "Merchant requested manual contact",
      priority: "MEDIUM",
    },
    note: "No ticket/order mutation executed in this safe step. Use this payload to create ticket/callback in next write phase.",
  };
}

function buildHelpMessage() {
  return "Ami help korte pari: ajker sales, low stock, pending order, top product, payout status, risk alerts, and admin/staff contact request.";
}

async function queryOpsAssistant({
  shopId,
  message,
  channel = "WHATSAPP",
}) {
  const intent = detectIntent(message);
  const normalizedChannel = String(channel || "WHATSAPP").toUpperCase();
  const generatedAt = new Date().toISOString();

  if (intent === "SALES_TODAY") {
    const sales = await getTodaySales({ shopId });
    return {
      intent,
      channel: normalizedChannel,
      generatedAt,
      reply: `Ajke total ${sales.orderCount} order theke BDT ${sales.revenue.toFixed(2)} sales hoyeche.`,
      data: sales,
    };
  }

  if (intent === "LOW_STOCK") {
    const lowStock = await getLowStock({ shopId, threshold: 10, limit: 5 });
    if (!lowStock.length) {
      return {
        intent,
        channel: normalizedChannel,
        generatedAt,
        reply: "Good news: no low-stock item found right now.",
        data: [],
      };
    }
    const items = lowStock.map(i => `${i.name}(${i.stock})`).join(", ");
    return {
      intent,
      channel: normalizedChannel,
      generatedAt,
      reply: `Low-stock items: ${items}`,
      data: lowStock,
    };
  }

  if (intent === "PENDING_ORDERS") {
    const pendingCount = await getPendingOrders({ shopId });
    return {
      intent,
      channel: normalizedChannel,
      generatedAt,
      reply: `Ekhon ${pendingCount} pending order ache.`,
      data: { pendingCount },
    };
  }

  if (intent === "TOP_PRODUCT_WEEK") {
    const top = await getTopProductWeek({ shopId });
    if (!top) {
      return {
        intent,
        channel: normalizedChannel,
        generatedAt,
        reply: "Last 7 days sales data paoa jayni.",
        data: null,
      };
    }
    return {
      intent,
      channel: normalizedChannel,
      generatedAt,
      reply: `Last 7 days top product: ${top.name} (${top.soldQty} units).`,
      data: top,
    };
  }

  if (intent === "PAYOUT_STATUS") {
    const payout = await getPayoutStatus({ shopId });
    return {
      intent,
      channel: normalizedChannel,
      generatedAt,
      reply: `Last 30 days payout status: success ${payout.successCount}, failed ${payout.failedCount}, pending ${payout.pendingCount}.`,
      data: payout,
    };
  }

  if (intent === "RISK_ALERTS") {
    const alerts = await getRiskAlerts({ shopId, limit: 3 });
    if (!alerts.length) {
      return {
        intent,
        channel: normalizedChannel,
        generatedAt,
        reply: "Currently no unresolved medium/high risk alert.",
        data: [],
      };
    }
    return {
      intent,
      channel: normalizedChannel,
      generatedAt,
      reply: `Alert: ${alerts[0].message}`,
      data: alerts,
    };
  }

  if (intent === "CONTACT_SUPPORT") {
    const proposal = buildContactActionProposal({
      rawMessage: message,
      channel: normalizedChannel,
    });
    return {
      intent,
      channel: normalizedChannel,
      generatedAt,
      reply: "Apnar message contact request draft hishebe ready kora hoyeche.",
      data: proposal,
    };
  }

  return {
    intent: "HELP",
    channel: normalizedChannel,
    generatedAt,
    reply: buildHelpMessage(),
    data: null,
  };
}

async function createContactRequest({
  shopId,
  requestedBy = null,
  message = "",
  targetRole = "SUPPORT",
  channel = "WHATSAPP",
  priority = "MEDIUM",
  callbackPhone = "",
  sourceIntent = "MANUAL",
  idempotencyKey = null,
}) {
  const payload = {
    shopId,
    requestedBy: requestedBy || null,
    message: String(message || "").trim(),
    targetRole: String(targetRole || "SUPPORT").toUpperCase(),
    channel: String(channel || "WHATSAPP").toUpperCase(),
    priority: String(priority || "MEDIUM").toUpperCase(),
    callbackPhone: String(callbackPhone || "").trim(),
    sourceIntent: String(sourceIntent || "MANUAL").toUpperCase(),
    status: "QUEUED",
    idempotencyKey: idempotencyKey || null,
  };

  if (idempotencyKey) {
    const existing = await ContactRequest.findOne({
      shopId,
      idempotencyKey,
    });
    if (existing) {
      return {
        contactRequest: existing,
        idempotencyReplay: true,
      };
    }
  }

  try {
    const contactRequest = await ContactRequest.create(payload);
    return {
      contactRequest,
      idempotencyReplay: false,
    };
  } catch (err) {
    if (err?.code === 11000 && idempotencyKey) {
      const existing = await ContactRequest.findOne({
        shopId,
        idempotencyKey,
      });
      if (existing) {
        return {
          contactRequest: existing,
          idempotencyReplay: true,
        };
      }
    }
    throw err;
  }
}

async function listContactRequests({
  shopId,
  status = "",
  targetRole = "",
  limit = 50,
}) {
  const query = {
    shopId,
    ...(status ? { status: String(status).toUpperCase() } : {}),
    ...(targetRole ? { targetRole: String(targetRole).toUpperCase() } : {}),
  };

  const rows = await ContactRequest.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(toNumber(limit, 50), 1), 200))
    .lean();

  return rows.map(item => ({
    _id: item._id,
    shopId: item.shopId,
    requestedBy: item.requestedBy,
    sourceIntent: item.sourceIntent,
    targetRole: item.targetRole,
    channel: item.channel,
    priority: item.priority,
    message: item.message,
    callbackPhone: item.callbackPhone || "",
    status: item.status,
    inProgressAt: item.inProgressAt || null,
    inProgressBy: item.inProgressBy || null,
    resolvedAt: item.resolvedAt || null,
    resolvedBy: item.resolvedBy || null,
    cancelledAt: item.cancelledAt || null,
    cancelledBy: item.cancelledBy || null,
    statusHistory: item.statusHistory || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

function normalizeActorRole(role = "") {
  return String(role || "").toUpperCase();
}

function assertStatusTransition({ currentStatus, nextStatus }) {
  const transitions = {
    QUEUED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["RESOLVED", "CANCELLED"],
    RESOLVED: [],
    CANCELLED: [],
  };

  const allowed = transitions[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    const err = new Error(`Invalid status transition from ${currentStatus} to ${nextStatus}`);
    err.statusCode = 409;
    throw err;
  }
}

function assertActorCanUpdateStatus({ actorRole, nextStatus }) {
  const role = normalizeActorRole(actorRole);
  if (!["OWNER", "ADMIN", "STAFF"].includes(role)) {
    const err = new Error("Contact request update role is not allowed");
    err.statusCode = 403;
    throw err;
  }

  if (["OWNER", "ADMIN"].includes(role)) return;

  // Staff can only pick up request for work.
  if (role === "STAFF" && nextStatus === "IN_PROGRESS") return;

  const err = new Error("Staff can only move contact request to IN_PROGRESS");
  err.statusCode = 403;
  throw err;
}

async function updateContactRequestStatus({
  shopId,
  requestId,
  actorUserId = null,
  actorRole = "",
  status,
  note = "",
}) {
  const nextStatus = String(status || "").toUpperCase();
  const request = await ContactRequest.findOne({
    _id: requestId,
    shopId,
  });

  if (!request) {
    const err = new Error("Contact request not found");
    err.statusCode = 404;
    throw err;
  }

  if (request.status === nextStatus) {
    return {
      contactRequest: request,
      idempotencyReplay: true,
    };
  }

  assertActorCanUpdateStatus({
    actorRole,
    nextStatus,
  });

  assertStatusTransition({
    currentStatus: request.status,
    nextStatus,
  });

  const previousStatus = request.status;
  request.status = nextStatus;

  const now = new Date();
  if (nextStatus === "IN_PROGRESS") {
    request.inProgressAt = now;
    request.inProgressBy = actorUserId || null;
  }
  if (nextStatus === "RESOLVED") {
    request.resolvedAt = now;
    request.resolvedBy = actorUserId || null;
  }
  if (nextStatus === "CANCELLED") {
    request.cancelledAt = now;
    request.cancelledBy = actorUserId || null;
  }

  request.statusHistory = request.statusHistory || [];
  request.statusHistory.push({
    fromStatus: previousStatus,
    toStatus: nextStatus,
    actorUserId: actorUserId || null,
    actorRole: normalizeActorRole(actorRole),
    note: String(note || "").trim(),
    at: now,
  });

  await request.save();

  return {
    contactRequest: request,
    idempotencyReplay: false,
  };
}

module.exports = {
  queryOpsAssistant,
  createContactRequest,
  listContactRequests,
  updateContactRequestStatus,
  _internals: {
    normalizeBanglaDigits,
    normalizeMessage,
    detectIntent,
    detectContactTarget,
    buildContactActionProposal,
    buildHelpMessage,
    toNumber,
    normalizeActorRole,
    assertStatusTransition,
    assertActorCanUpdateStatus,
  },
};
