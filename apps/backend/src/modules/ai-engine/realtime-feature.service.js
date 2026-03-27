const AiFeedback = require("../../models/aiFeedback.model");
const Cart = require("../../models/cart.model");
const Event = require("../../models/event.model");
const cache = require("../../infrastructure/redis/cache.service");

const REALTIME_TTL_SECONDS = 30 * 60;

function normalizeSessionId(sessionId, userId) {
  return String(sessionId || userId || "anonymous");
}

function buildRealtimeKey({ userId, sessionId }) {
  return `ai:realtime:${userId || "guest"}:${normalizeSessionId(sessionId, userId)}`;
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

async function hydrateRealtimeFeatures({ userId, sessionId, shopId = null }) {
  const [feedbackRows, carts, recentEvents] = await Promise.all([
    userId
      ? AiFeedback.find({
          userId,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        })
          .sort({ createdAt: -1 })
          .limit(40)
          .select("productId shopId eventType createdAt")
          .lean()
      : [],
    userId
      ? Cart.find({ userId, ...(shopId ? { shopId } : {}) })
          .select("shopId items.productId updatedAt")
          .lean()
      : [],
    userId
      ? Event.find({
          "metadata.user": userId,
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .select("type aggregateId createdAt metadata")
          .lean()
      : [],
  ]);

  return {
    sessionId: normalizeSessionId(sessionId, userId),
    clickedProductIds: uniqueStrings(
      feedbackRows.filter((row) => row.eventType === "click").map((row) => row.productId)
    ),
    ignoredProductIds: uniqueStrings(
      feedbackRows.filter((row) => row.eventType === "ignore").map((row) => row.productId)
    ),
    purchasedProductIds: uniqueStrings(
      feedbackRows.filter((row) => row.eventType === "purchase").map((row) => row.productId)
    ),
    cartProductIds: uniqueStrings(
      carts.flatMap((cart) => (cart.items || []).map((item) => item.productId))
    ),
    activeShopIds: uniqueStrings([
      ...feedbackRows.map((row) => row.shopId),
      ...carts.map((cart) => cart.shopId),
    ]),
    recentEventTypes: recentEvents.slice(0, 10).map((row) => row.type),
    sessionActivityCount: recentEvents.length,
    lastActivityAt: recentEvents[0]?.createdAt || feedbackRows[0]?.createdAt || carts[0]?.updatedAt || null,
  };
}

async function getRealtimeFeatures({ userId, sessionId, shopId = null }) {
  const key = buildRealtimeKey({ userId, sessionId });
  const cached = await cache.get(key);
  if (cached) {
    return cached;
  }

  const features = await hydrateRealtimeFeatures({ userId, sessionId, shopId });
  await cache.set(key, features, REALTIME_TTL_SECONDS);
  return features;
}

async function updateRealtimeFeatureState({ userId, sessionId, updater, shopId = null }) {
  const key = buildRealtimeKey({ userId, sessionId });
  const current = (await cache.get(key)) || (await hydrateRealtimeFeatures({ userId, sessionId, shopId }));
  const nextValue = updater({ ...(current || {}) });
  await cache.set(key, nextValue, REALTIME_TTL_SECONDS);
  return nextValue;
}

async function registerRealtimeFeedback({ userId, sessionId, productId, shopId, eventType }) {
  return updateRealtimeFeatureState({
    userId,
    sessionId,
    shopId,
    updater: (current) => {
      const next = {
        ...current,
        clickedProductIds: uniqueStrings(current.clickedProductIds || []),
        ignoredProductIds: uniqueStrings(current.ignoredProductIds || []),
        purchasedProductIds: uniqueStrings(current.purchasedProductIds || []),
        activeShopIds: uniqueStrings(current.activeShopIds || []),
        lastActivityAt: new Date().toISOString(),
      };

      if (shopId) {
        next.activeShopIds = uniqueStrings([...(next.activeShopIds || []), shopId]);
      }
      if (productId && eventType === "click") {
        next.clickedProductIds = uniqueStrings([productId, ...(next.clickedProductIds || [])]).slice(0, 20);
      }
      if (productId && eventType === "ignore") {
        next.ignoredProductIds = uniqueStrings([productId, ...(next.ignoredProductIds || [])]).slice(0, 20);
      }
      if (productId && eventType === "purchase") {
        next.purchasedProductIds = uniqueStrings([productId, ...(next.purchasedProductIds || [])]).slice(0, 20);
      }
      next.sessionActivityCount = Number(current.sessionActivityCount || 0) + 1;
      return next;
    },
  });
}

async function recordSessionActivity({ userId, sessionId, route = "general", shopId = null }) {
  return updateRealtimeFeatureState({
    userId,
    sessionId,
    shopId,
    updater: (current) => ({
      ...current,
      activeShopIds: uniqueStrings([...(current.activeShopIds || []), shopId]).filter(Boolean),
      recentEventTypes: uniqueStrings([route, ...(current.recentEventTypes || [])]).slice(0, 10),
      sessionActivityCount: Number(current.sessionActivityCount || 0) + 1,
      lastActivityAt: new Date().toISOString(),
    }),
  });
}

module.exports = {
  getRealtimeFeatures,
  registerRealtimeFeedback,
  recordSessionActivity,
};
