const AdCampaign = require("./models/adsCampaign.model");
const Product = require("@/models/product.model");
const Order = require("@/models/order.model");
const Shop = require("@/models/shop.model");
const AdsCampaignMetric = require("./models/adsCampaignMetric.model");
const AdsCampaignApproval = require("./models/adsCampaignApproval.model");
const AdsSyncTask = require("./models/adsSyncTask.model");
const Outbox = require("@/models/outbox.model");
const { getAdsConnector } = require("./connectors");
const crypto = require("crypto");

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStatus(value = "") {
  return String(value || "").trim().toUpperCase();
}

function normalizeObjective(value = "") {
  return String(value || "").trim().toUpperCase();
}

function normalizePlatform(value = "") {
  return String(value || "").trim().toLowerCase();
}

function buildPlatformPayload(platforms = {}) {
  return {
    facebook: {
      enabled: Boolean(platforms?.facebook?.enabled),
      accountId: String(platforms?.facebook?.accountId || "").trim(),
    },
    google: {
      enabled: Boolean(platforms?.google?.enabled),
      accountId: String(platforms?.google?.accountId || "").trim(),
    },
    youtube: {
      enabled: Boolean(platforms?.youtube?.enabled),
      accountId: String(platforms?.youtube?.accountId || "").trim(),
    },
  };
}

function ensureAtLeastOnePlatformEnabled(platforms = {}) {
  const enabled = Boolean(
    platforms?.facebook?.enabled || platforms?.google?.enabled || platforms?.youtube?.enabled
  );
  if (!enabled) {
    const err = new Error("At least one platform must be enabled");
    err.statusCode = 400;
    throw err;
  }
}

function mapCampaign(item) {
  return {
    _id: item._id,
    shopId: item.shopId,
    createdBy: item.createdBy || null,
    name: item.name,
    objective: item.objective,
    status: item.status,
    platforms: item.platforms || {},
    budget: item.budget || {},
    creative: item.creative || {},
    audience: item.audience || {},
    smartBidding: item.smartBidding || {},
    couponTracking: item.couponTracking || {},
    feedSync: item.feedSync || {},
    guardrail: item.guardrail || {},
    productIds: item.productIds || [],
    statusHistory: item.statusHistory || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function createCampaign({
  shopId,
  userId = null,
  payload = {},
  idempotencyKey = null,
}) {
  if (idempotencyKey) {
    const existing = await AdCampaign.findOne({
      shopId,
      idempotencyKey,
    });
    if (existing) {
      return {
        campaign: mapCampaign(existing),
        idempotencyReplay: true,
      };
    }
  }

  const platforms = buildPlatformPayload(payload.platforms || {});
  ensureAtLeastOnePlatformEnabled(platforms);

  const doc = {
    shopId,
    createdBy: userId || null,
    name: String(payload.name || "").trim(),
    objective: normalizeObjective(payload.objective || "SALES"),
    status: "DRAFT",
    platforms,
    budget: {
      daily: toNumber(payload?.budget?.daily, 0),
      lifetime: toNumber(payload?.budget?.lifetime, 0),
      currency: String(payload?.budget?.currency || "BDT").trim().toUpperCase(),
      startDate: payload?.budget?.startDate ? new Date(payload.budget.startDate) : null,
      endDate: payload?.budget?.endDate ? new Date(payload.budget.endDate) : null,
    },
    creative: {
      headline: String(payload?.creative?.headline || "").trim(),
      primaryText: String(payload?.creative?.primaryText || "").trim(),
      cta: String(payload?.creative?.cta || "BUY_NOW").trim().toUpperCase(),
      landingUrl: String(payload?.creative?.landingUrl || "").trim(),
      mediaUrls: Array.isArray(payload?.creative?.mediaUrls) ? payload.creative.mediaUrls : [],
    },
    audience: {
      locations: Array.isArray(payload?.audience?.locations) ? payload.audience.locations : [],
      interests: Array.isArray(payload?.audience?.interests) ? payload.audience.interests : [],
      ageMin: toNumber(payload?.audience?.ageMin, 18),
      ageMax: toNumber(payload?.audience?.ageMax, 65),
      gender: String(payload?.audience?.gender || "ALL").trim().toUpperCase(),
      frequencyCapPerUserPerDay: toNumber(payload?.audience?.frequencyCapPerUserPerDay, 3),
    },
    smartBidding: {
      goalType: String(payload?.smartBidding?.goalType || "SALES").trim().toUpperCase(),
      strategy: String(payload?.smartBidding?.strategy || "MAX_CONVERSIONS").trim().toUpperCase(),
      targetCpa: toNumber(payload?.smartBidding?.targetCpa, 0),
      targetRoas: toNumber(payload?.smartBidding?.targetRoas, 0),
    },
    couponTracking: {
      enabled: Boolean(payload?.couponTracking?.enabled),
      couponCode: String(payload?.couponTracking?.couponCode || "").trim(),
    },
    guardrail: {
      dailySpendLimit: toNumber(payload?.guardrail?.dailySpendLimit, toNumber(payload?.budget?.daily, 0)),
      anomalyThresholdPct: toNumber(payload?.guardrail?.anomalyThresholdPct, 50),
    },
    productIds: Array.isArray(payload.productIds) ? payload.productIds : [],
    idempotencyKey: idempotencyKey || null,
  };

  try {
    const campaign = await AdCampaign.create(doc);
    return {
      campaign: mapCampaign(campaign),
      idempotencyReplay: false,
    };
  } catch (err) {
    if (err?.code === 11000 && idempotencyKey) {
      const existing = await AdCampaign.findOne({
        shopId,
        idempotencyKey,
      });
      if (existing) {
        return {
          campaign: mapCampaign(existing),
          idempotencyReplay: true,
        };
      }
    }
    throw err;
  }
}

async function listCampaigns({
  shopId,
  status = "",
  objective = "",
  platform = "",
  limit = 50,
}) {
  const query = {
    shopId,
    ...(status ? { status: normalizeStatus(status) } : {}),
    ...(objective ? { objective: normalizeObjective(objective) } : {}),
  };

  const normalizedPlatform = normalizePlatform(platform);
  if (["facebook", "google", "youtube"].includes(normalizedPlatform)) {
    query[`platforms.${normalizedPlatform}.enabled`] = true;
  }

  const rows = await AdCampaign.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(toNumber(limit, 50), 1), 200))
    .lean();

  return rows.map(mapCampaign);
}

async function getCampaignById({
  shopId,
  campaignId,
}) {
  const campaign = await AdCampaign.findOne({
    _id: campaignId,
    shopId,
  }).lean();

  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  return mapCampaign(campaign);
}

async function updateCampaign({
  shopId,
  campaignId,
  userId = null,
  payload = {},
}) {
  const campaign = await AdCampaign.findOne({
    _id: campaignId,
    shopId,
  });

  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  if (!["DRAFT", "PAUSED", "FAILED"].includes(campaign.status)) {
    const err = new Error("Campaign can only be edited in DRAFT, PAUSED or FAILED state");
    err.statusCode = 409;
    throw err;
  }

  if (payload.name !== undefined) {
    campaign.name = String(payload.name || "").trim();
  }
  if (payload.objective !== undefined) {
    campaign.objective = normalizeObjective(payload.objective);
  }
  if (payload.platforms !== undefined) {
    const platforms = buildPlatformPayload(payload.platforms || {});
    ensureAtLeastOnePlatformEnabled(platforms);
    campaign.platforms.facebook.enabled = platforms.facebook.enabled;
    campaign.platforms.facebook.accountId = platforms.facebook.accountId;
    campaign.platforms.google.enabled = platforms.google.enabled;
    campaign.platforms.google.accountId = platforms.google.accountId;
    campaign.platforms.youtube.enabled = platforms.youtube.enabled;
    campaign.platforms.youtube.accountId = platforms.youtube.accountId;
  }

  if (payload.budget !== undefined) {
    campaign.budget.daily = toNumber(payload?.budget?.daily, campaign.budget.daily);
    campaign.budget.lifetime = toNumber(payload?.budget?.lifetime, campaign.budget.lifetime);
    campaign.budget.currency = String(payload?.budget?.currency || campaign.budget.currency || "BDT")
      .trim()
      .toUpperCase();
    campaign.budget.startDate = payload?.budget?.startDate
      ? new Date(payload.budget.startDate)
      : campaign.budget.startDate;
    campaign.budget.endDate = payload?.budget?.endDate
      ? new Date(payload.budget.endDate)
      : campaign.budget.endDate;
  }

  if (payload.creative !== undefined) {
    campaign.creative.headline = String(payload?.creative?.headline || campaign.creative.headline || "").trim();
    campaign.creative.primaryText = String(
      payload?.creative?.primaryText || campaign.creative.primaryText || ""
    ).trim();
    campaign.creative.cta = String(payload?.creative?.cta || campaign.creative.cta || "BUY_NOW")
      .trim()
      .toUpperCase();
    campaign.creative.landingUrl = String(
      payload?.creative?.landingUrl || campaign.creative.landingUrl || ""
    ).trim();
    campaign.creative.mediaUrls = Array.isArray(payload?.creative?.mediaUrls)
      ? payload.creative.mediaUrls
      : campaign.creative.mediaUrls;
  }

  if (payload.audience !== undefined) {
    campaign.audience.locations = Array.isArray(payload?.audience?.locations)
      ? payload.audience.locations
      : campaign.audience.locations;
    campaign.audience.interests = Array.isArray(payload?.audience?.interests)
      ? payload.audience.interests
      : campaign.audience.interests;
    campaign.audience.ageMin = toNumber(payload?.audience?.ageMin, campaign.audience.ageMin);
    campaign.audience.ageMax = toNumber(payload?.audience?.ageMax, campaign.audience.ageMax);
    campaign.audience.gender = String(payload?.audience?.gender || campaign.audience.gender || "ALL")
      .trim()
      .toUpperCase();
    campaign.audience.frequencyCapPerUserPerDay = toNumber(
      payload?.audience?.frequencyCapPerUserPerDay,
      campaign.audience.frequencyCapPerUserPerDay
    );
  }

  if (payload.smartBidding !== undefined) {
    campaign.smartBidding.goalType = String(
      payload?.smartBidding?.goalType || campaign.smartBidding.goalType || "SALES"
    )
      .trim()
      .toUpperCase();
    campaign.smartBidding.strategy = String(
      payload?.smartBidding?.strategy || campaign.smartBidding.strategy || "MAX_CONVERSIONS"
    )
      .trim()
      .toUpperCase();
    campaign.smartBidding.targetCpa = toNumber(
      payload?.smartBidding?.targetCpa,
      campaign.smartBidding.targetCpa
    );
    campaign.smartBidding.targetRoas = toNumber(
      payload?.smartBidding?.targetRoas,
      campaign.smartBidding.targetRoas
    );
  }

  if (payload.couponTracking !== undefined) {
    campaign.couponTracking.enabled = Boolean(
      payload?.couponTracking?.enabled !== undefined
        ? payload.couponTracking.enabled
        : campaign.couponTracking.enabled
    );
    campaign.couponTracking.couponCode = String(
      payload?.couponTracking?.couponCode || campaign.couponTracking.couponCode || ""
    ).trim();
  }

  if (payload.guardrail !== undefined) {
    campaign.guardrail.dailySpendLimit = toNumber(
      payload?.guardrail?.dailySpendLimit,
      campaign.guardrail.dailySpendLimit
    );
    campaign.guardrail.anomalyThresholdPct = toNumber(
      payload?.guardrail?.anomalyThresholdPct,
      campaign.guardrail.anomalyThresholdPct
    );
  }

  if (payload.productIds !== undefined) {
    campaign.productIds = Array.isArray(payload.productIds) ? payload.productIds : campaign.productIds;
  }

  campaign.statusHistory = campaign.statusHistory || [];
  campaign.statusHistory.push({
    fromStatus: campaign.status,
    toStatus: campaign.status,
    actorUserId: userId || null,
    action: "UPDATE",
    note: String(payload.note || "Campaign updated").trim(),
    at: new Date(),
  });

  await campaign.save();
  return mapCampaign(campaign);
}

function assertTransition(currentStatus, targetStatus) {
  const transitions = {
    DRAFT: ["QUEUED", "FAILED"],
    QUEUED: ["ACTIVE", "FAILED", "PAUSED"],
    ACTIVE: ["PAUSED", "COMPLETED", "FAILED"],
    PAUSED: ["QUEUED", "ACTIVE", "FAILED", "COMPLETED"],
    COMPLETED: [],
    FAILED: ["DRAFT", "QUEUED"],
  };
  const allowed = transitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    const err = new Error(`Invalid campaign status transition from ${currentStatus} to ${targetStatus}`);
    err.statusCode = 409;
    throw err;
  }
}

async function ensureSyncTasksForCampaign(campaign) {
  const platforms = ["facebook", "google", "youtube"];
  const tasks = [];

  for (const platform of platforms) {
    if (!campaign.platforms?.[platform]?.enabled) continue;

    const task = await AdsSyncTask.findOneAndUpdate(
      { campaignId: campaign._id, platform },
      {
        $setOnInsert: {
          campaignId: campaign._id,
          shopId: campaign.shopId,
          platform,
          maxAttempts: 5,
          attempts: 0,
          status: "PENDING",
          nextRetryAt: new Date(),
          lastError: "",
          lockedAt: null,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    tasks.push(task);

    // Outbox trace for async sync flow (idempotent by task uniqueness at campaign+platform).
    await Outbox.create({
      type: "ads.campaign.sync.requested",
      payload: {
        campaignId: campaign._id,
        shopId: campaign.shopId,
        platform,
        taskId: task._id,
      },
      processed: false,
    }).catch(() => {});
  }

  return tasks;
}

async function updateCampaignStatus({
  shopId,
  campaignId,
  userId = null,
  nextStatus,
  note = "",
}) {
  const campaign = await AdCampaign.findOne({
    _id: campaignId,
    shopId,
  });

  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const target = normalizeStatus(nextStatus);
  if (campaign.status === target) {
    return {
      campaign: mapCampaign(campaign),
      idempotencyReplay: true,
    };
  }

  assertTransition(campaign.status, target);

  const prev = campaign.status;
  campaign.status = target;

  if (target === "QUEUED") {
    for (const key of ["facebook", "google", "youtube"]) {
      if (campaign.platforms?.[key]?.enabled) {
        campaign.platforms[key].syncStatus = "PENDING";
      }
    }
    await ensureSyncTasksForCampaign(campaign);
  }

  campaign.statusHistory = campaign.statusHistory || [];
  campaign.statusHistory.push({
    fromStatus: prev,
    toStatus: target,
    actorUserId: userId || null,
    action: "STATUS_UPDATE",
    note: String(note || "").trim(),
    at: new Date(),
  });

  await campaign.save();
  return {
    campaign: mapCampaign(campaign),
    idempotencyReplay: false,
  };
}

function hashFeed(items = []) {
  return crypto
    .createHash("sha1")
    .update(JSON.stringify(items))
    .digest("hex");
}

function dayKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function pickArray(values = [], limit = 5) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

async function getAiCreativeSuggestion({ shopId, campaignId }) {
  const campaign = await AdCampaign.findOne({ _id: campaignId, shopId }).lean();
  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const products = await Product.find({
    _id: { $in: campaign.productIds || [] },
    shopId,
  })
    .select("name brand category price")
    .limit(5)
    .lean();

  const name = products[0]?.name || campaign.name;
  const category = products[0]?.category || "products";
  const price = Number(products[0]?.price || 0);

  return {
    campaignId: campaign._id,
    generatedAt: new Date().toISOString(),
    bn: {
      headline: `${name} এখন বিশেষ অফারে`,
      primaryText: `${category} ক্যাটাগরির জনপ্রিয় পণ্য ${name} এখন সাশ্রয়ী দামে পাওয়া যাচ্ছে।`,
      cta: "এখনই অর্ডার করুন",
      bannerText: `${name} | সীমিত সময়ের অফার`,
    },
    en: {
      headline: `${name} on Special Offer`,
      primaryText: `Top ${category} pick ${name} is now available at a better value price.`,
      cta: "Order Now",
      bannerText: `${name} | Limited Time Deal`,
    },
    meta: {
      referencePrice: price,
      productCount: products.length,
    },
  };
}

async function getAudienceRecommendation({ shopId, campaignId, days = 30 }) {
  const campaign = await AdCampaign.findOne({ _id: campaignId, shopId }).lean();
  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const windowDays = Math.min(Math.max(toNumber(days, 30), 7), 120);
  const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [shop, topCategories] = await Promise.all([
    Shop.findById(shopId).select("location.address").lean(),
    Order.aggregate([
      {
        $match: {
          shopId,
          status: { $in: ["CONFIRMED", "SHIPPED", "DELIVERED"] },
          createdAt: { $gte: sinceDate },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          soldQty: { $sum: "$items.quantity" },
        },
      },
      { $sort: { soldQty: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const interests = topCategories.map(c => String(c._id || "").trim()).filter(Boolean);

  return {
    campaignId: campaign._id,
    generatedAt: new Date().toISOString(),
    recommendation: {
      geo: pickArray(
        [
          shop?.location?.address || "",
          ...(campaign.audience?.locations || []),
        ],
        5
      ),
      interests: pickArray([...(campaign.audience?.interests || []), ...interests], 8),
      ageMin: campaign.audience?.ageMin || 18,
      ageMax: campaign.audience?.ageMax || 65,
      gender: campaign.audience?.gender || "ALL",
    },
  };
}

async function syncProductFeed({ shopId, campaignId }) {
  const campaign = await AdCampaign.findOne({ _id: campaignId, shopId });
  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const products = await Product.find({
    _id: { $in: campaign.productIds || [] },
    shopId,
    isActive: true,
  })
    .select("name brand category price stock imageUrl barcode")
    .lean();

  const feedItems = products.map(p => ({
    productId: p._id,
    title: p.name,
    brand: p.brand || "",
    category: p.category || "",
    price: Number(p.price || 0),
    stock: Number(p.stock || 0),
    imageUrl: p.imageUrl || "",
    barcode: p.barcode || "",
  }));
  const hash = hashFeed(feedItems);

  campaign.feedSync = campaign.feedSync || {};
  campaign.feedSync.lastSyncedAt = new Date();
  campaign.feedSync.itemCount = feedItems.length;
  campaign.feedSync.hash = hash;
  campaign.feedSync.syncStatus = "SYNCED";
  campaign.feedSync.lastError = "";
  await campaign.save();

  return {
    campaignId: campaign._id,
    syncedAt: campaign.feedSync.lastSyncedAt,
    itemCount: feedItems.length,
    hash,
    items: feedItems,
  };
}

async function upsertDailyMetric({
  shopId,
  campaignId,
  date = null,
  payload = {},
}) {
  const campaign = await AdCampaign.findOne({ _id: campaignId, shopId }).lean();
  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const key = dayKey(date || new Date());
  const update = {
    spend: toNumber(payload.spend, 0),
    impressions: toNumber(payload.impressions, 0),
    reach: toNumber(payload.reach, 0),
    clicks: toNumber(payload.clicks, 0),
    conversions: toNumber(payload.conversions, 0),
    revenue: toNumber(payload.revenue, 0),
    couponOrders: toNumber(payload.couponOrders, 0),
  };

  const metric = await AdsCampaignMetric.findOneAndUpdate(
    { campaignId, shopId, dateKey: key },
    { $set: update, $setOnInsert: { campaignId, shopId, dateKey: key } },
    { upsert: true, returnDocument: "after" }
  );

  return metric;
}

async function getSmartBiddingRecommendation({ shopId, campaignId, days = 14 }) {
  const campaign = await AdCampaign.findOne({ _id: campaignId, shopId }).lean();
  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const windowDays = Math.min(Math.max(toNumber(days, 14), 3), 90);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const metrics = await AdsCampaignMetric.find({
    campaignId,
    shopId,
    createdAt: { $gte: since },
  }).lean();

  const totals = metrics.reduce(
    (acc, row) => {
      acc.spend += Number(row.spend || 0);
      acc.clicks += Number(row.clicks || 0);
      acc.conversions += Number(row.conversions || 0);
      acc.revenue += Number(row.revenue || 0);
      return acc;
    },
    { spend: 0, clicks: 0, conversions: 0, revenue: 0 }
  );

  const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

  const goalType = campaign.smartBidding?.goalType || "SALES";
  let strategy = campaign.smartBidding?.strategy || "MAX_CONVERSIONS";
  let suggestion = "Maintain current bidding settings";

  if (goalType === "SALES" && roas < 1.5) {
    strategy = "TARGET_ROAS";
    suggestion = "Shift to TARGET_ROAS and tighten audience for purchase intent.";
  } else if (goalType === "LEADS" && cpa > 0 && campaign.smartBidding?.targetCpa > 0 && cpa > campaign.smartBidding.targetCpa) {
    strategy = "TARGET_CPA";
    suggestion = "Use TARGET_CPA to keep lead acquisition cost under control.";
  }

  return {
    campaignId,
    generatedAt: new Date().toISOString(),
    recommendation: {
      goalType,
      strategy,
      suggestedTargetCpa: Number(cpa.toFixed(2)),
      suggestedTargetRoas: Number(roas.toFixed(2)),
      note: suggestion,
    },
    diagnostics: {
      spend: Number(totals.spend.toFixed(2)),
      clicks: totals.clicks,
      conversions: totals.conversions,
      revenue: Number(totals.revenue.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      cpa: Number(cpa.toFixed(2)),
      roas: Number(roas.toFixed(2)),
    },
  };
}

async function checkDailyGuardrail({ shopId, campaignId }) {
  const campaign = await AdCampaign.findOne({ _id: campaignId, shopId }).lean();
  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const today = dayKey(new Date());
  const metric = await AdsCampaignMetric.findOne({
    campaignId,
    shopId,
    dateKey: today,
  }).lean();

  const spend = Number(metric?.spend || 0);
  const limit = Number(
    campaign.guardrail?.dailySpendLimit || campaign.budget?.daily || 0
  );
  const thresholdPct = Number(campaign.guardrail?.anomalyThresholdPct || 50);
  const thresholdValue = limit + (limit * thresholdPct) / 100;

  let level = "LOW";
  let message = "Daily spend is within guardrail.";
  if (limit > 0 && spend > limit) {
    level = "MEDIUM";
    message = "Daily spend exceeded configured daily limit.";
  }
  if (limit > 0 && spend > thresholdValue) {
    level = "HIGH";
    message = "Daily spend anomaly detected above threshold.";
  }

  return {
    campaignId,
    dateKey: today,
    guardrail: {
      dailySpendLimit: limit,
      anomalyThresholdPct: thresholdPct,
      thresholdValue: Number(thresholdValue.toFixed(2)),
    },
    spend: Number(spend.toFixed(2)),
    level,
    message,
  };
}

async function updateFrequencyCap({
  shopId,
  campaignId,
  capPerUserPerDay,
  userId = null,
}) {
  const campaign = await AdCampaign.findOne({ _id: campaignId, shopId });
  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const cap = Math.min(Math.max(toNumber(capPerUserPerDay, 3), 1), 30);
  const previous = Number(campaign.audience?.frequencyCapPerUserPerDay || 3);
  campaign.audience.frequencyCapPerUserPerDay = cap;
  campaign.statusHistory = campaign.statusHistory || [];
  campaign.statusHistory.push({
    fromStatus: campaign.status,
    toStatus: campaign.status,
    actorUserId: userId || null,
    action: "FREQUENCY_CAP_UPDATE",
    note: `frequency cap ${previous} -> ${cap}`,
    at: new Date(),
  });
  await campaign.save();

  return mapCampaign(campaign);
}

async function requestLaunchApproval({
  shopId,
  campaignId,
  makerId,
  reason = "",
}) {
  const campaign = await AdCampaign.findOne({ _id: campaignId, shopId });
  if (!campaign) {
    const err = new Error("Ad campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const existing = await AdsCampaignApproval.findOne({
    campaignId,
    shopId,
    status: "PENDING",
  });
  if (existing) {
    return {
      approval: existing,
      idempotencyReplay: true,
    };
  }

  const approval = await AdsCampaignApproval.create({
    campaignId,
    shopId,
    makerId,
    reason: String(reason || "").trim(),
    status: "PENDING",
  });

  return {
    approval,
    idempotencyReplay: false,
  };
}

async function approveLaunch({
  shopId,
  campaignId,
  checkerId,
  checkerComment = "",
}) {
  const pending = await AdsCampaignApproval.findOne({
    campaignId,
    shopId,
    status: "PENDING",
  });
  if (!pending) {
    const err = new Error("Pending approval not found");
    err.statusCode = 404;
    throw err;
  }
  if (String(pending.makerId) === String(checkerId)) {
    const err = new Error("Maker and checker cannot be the same user");
    err.statusCode = 409;
    throw err;
  }

  pending.status = "APPROVED";
  pending.checkerId = checkerId || null;
  pending.checkerComment = String(checkerComment || "").trim();
  await pending.save();

  const campaignResult = await updateCampaignStatus({
    shopId,
    campaignId,
    userId: checkerId || null,
    nextStatus: "QUEUED",
    note: "Campaign queued after approval",
  });

  return {
    approval: pending,
    campaign: campaignResult.campaign,
  };
}

async function rejectLaunch({
  shopId,
  campaignId,
  checkerId,
  checkerComment = "",
}) {
  const pending = await AdsCampaignApproval.findOne({
    campaignId,
    shopId,
    status: "PENDING",
  });
  if (!pending) {
    const err = new Error("Pending approval not found");
    err.statusCode = 404;
    throw err;
  }
  if (String(pending.makerId) === String(checkerId)) {
    const err = new Error("Maker and checker cannot be the same user");
    err.statusCode = 409;
    throw err;
  }

  pending.status = "REJECTED";
  pending.checkerId = checkerId || null;
  pending.checkerComment = String(checkerComment || "").trim();
  await pending.save();

  return pending;
}

function computeRetryDelayMs(attempts) {
  const base = 30 * 1000;
  const max = 15 * 60 * 1000;
  return Math.min(base * Math.max(1, 2 ** Math.max(0, attempts - 1)), max);
}

async function refreshCampaignStatusFromTasks(campaignId) {
  const campaign = await AdCampaign.findById(campaignId);
  if (!campaign) return null;

  const tasks = await AdsSyncTask.find({ campaignId }).lean();
  if (!tasks.length) return campaign;

  const allSynced = tasks.every(t => t.status === "SYNCED");
  const hasPending = tasks.some(t => ["PENDING", "PROCESSING"].includes(t.status));
  const hasFailed = tasks.some(t => t.status === "FAILED");
  const prev = campaign.status;

  if (allSynced && campaign.status !== "ACTIVE") {
    campaign.status = "ACTIVE";
    campaign.statusHistory = campaign.statusHistory || [];
    campaign.statusHistory.push({
      fromStatus: prev,
      toStatus: "ACTIVE",
      actorUserId: null,
      action: "AUTO_SYNC_TASK_COMPLETE",
      note: "All platform sync tasks completed",
      at: new Date(),
    });
    await campaign.save();
    return campaign;
  }

  if (!hasPending && hasFailed && campaign.status !== "FAILED") {
    campaign.status = "FAILED";
    campaign.statusHistory = campaign.statusHistory || [];
    campaign.statusHistory.push({
      fromStatus: prev,
      toStatus: "FAILED",
      actorUserId: null,
      action: "AUTO_SYNC_TASK_FAILED",
      note: "One or more platform sync tasks exhausted retries",
      at: new Date(),
    });
    await campaign.save();
    return campaign;
  }

  return campaign;
}

async function runSyncTaskBatch({ limit = 20 } = {}) {
  const batchLimit = Math.min(Math.max(toNumber(limit, 20), 1), 100);
  const now = new Date();
  const candidates = await AdsSyncTask.find({
    status: "PENDING",
    nextRetryAt: { $lte: now },
  })
    .sort({ nextRetryAt: 1, createdAt: 1 })
    .limit(batchLimit)
    .lean();

  let processed = 0;
  let synced = 0;
  let failed = 0;
  let retryScheduled = 0;

  for (const taskRef of candidates) {
    const task = await AdsSyncTask.findOneAndUpdate(
      {
        _id: taskRef._id,
        status: "PENDING",
        nextRetryAt: { $lte: new Date() },
      },
      {
        $set: {
          status: "PROCESSING",
          lockedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    if (!task) continue;

    processed += 1;
    const campaign = await AdCampaign.findById(task.campaignId);
    if (!campaign || campaign.status !== "QUEUED") {
      task.status = "FAILED";
      task.lastError = "Campaign not available for sync";
      task.attempts = Number(task.attempts || 0) + 1;
      await task.save();
      failed += 1;
      continue;
    }

    try {
      const connector = getAdsConnector(task.platform);
      const result = await connector.publishCampaign(campaign);

      task.status = "SYNCED";
      task.lockedAt = null;
      task.lastError = "";
      task.attempts = Number(task.attempts || 0) + 1;
      await task.save();

      campaign.platforms[task.platform].externalCampaignId = String(
        result?.externalCampaignId || `sim-${task.platform}-${campaign._id}`
      ).trim();
      campaign.platforms[task.platform].syncStatus = "SYNCED";
      campaign.platforms[task.platform].lastSyncAt = new Date();
      campaign.platforms[task.platform].lastError = "";
      await campaign.save();

      synced += 1;
    } catch (err) {
      const nextAttempts = Number(task.attempts || 0) + 1;
      const exhausted = nextAttempts >= Number(task.maxAttempts || 5);
      task.attempts = nextAttempts;
      task.lockedAt = null;
      task.lastError = String(err?.message || "Sync failed");
      if (exhausted) {
        task.status = "FAILED";
        failed += 1;
      } else {
        task.status = "PENDING";
        task.nextRetryAt = new Date(Date.now() + computeRetryDelayMs(nextAttempts));
        retryScheduled += 1;
      }
      await task.save();

      campaign.platforms[task.platform].syncStatus = exhausted ? "FAILED" : "PENDING";
      campaign.platforms[task.platform].lastSyncAt = new Date();
      campaign.platforms[task.platform].lastError = task.lastError;
      await campaign.save();
    }

    await refreshCampaignStatusFromTasks(task.campaignId);
  }

  return {
    processed,
    synced,
    failed,
    retryScheduled,
  };
}

async function runQueuedCampaignSyncBatch({ limit = 20 } = {}) {
  // Backward-compatible wrapper: ensure tasks exist then process task batch.
  const queuedCampaigns = await AdCampaign.find({ status: "QUEUED" })
    .sort({ createdAt: 1 })
    .limit(Math.min(Math.max(toNumber(limit, 20), 1), 100));
  for (const campaign of queuedCampaigns) {
    await ensureSyncTasksForCampaign(campaign);
  }
  const result = await runSyncTaskBatch({ limit });
  return {
    processed: result.processed,
    activated: result.synced,
    failed: result.failed,
  };
}

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  getAiCreativeSuggestion,
  getAudienceRecommendation,
  syncProductFeed,
  upsertDailyMetric,
  getSmartBiddingRecommendation,
  checkDailyGuardrail,
  updateFrequencyCap,
  requestLaunchApproval,
  approveLaunch,
  rejectLaunch,
  runSyncTaskBatch,
  runQueuedCampaignSyncBatch,
  toNumber,
  _internals: {
    normalizeStatus,
    normalizeObjective,
    normalizePlatform,
    buildPlatformPayload,
    ensureAtLeastOnePlatformEnabled,
    assertTransition,
    computeRetryDelayMs,
    dayKey,
    hashFeed,
  },
};
