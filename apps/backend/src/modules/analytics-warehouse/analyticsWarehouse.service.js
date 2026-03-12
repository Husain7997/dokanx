const AnalyticsSnapshot = require("./models/analyticsSnapshot.model");
const analytics = require("@/analytics");

async function storeSnapshot({ shopId, metricType, dateKey, payload }) {
  return AnalyticsSnapshot.findOneAndUpdate(
    { shopId: shopId || null, metricType, dateKey },
    { $set: { payload } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function buildWarehouseSnapshots({ shopId = null, input = {} }) {
  const dailySales = await analytics.buildDailySalesAggregate({ rows: input.dailySales || [] });
  const cohorts = analytics.buildMerchantCohorts({ merchants: input.merchants || [] });
  const regionalDemand = analytics.buildRegionalDemand({ rows: input.regionalDemand || [] });
  const trends = analytics.buildTrendAnalytics({
    current: input.currentTrends || [],
    previous: input.previousTrends || [],
  });

  const dateKey = new Date().toISOString().slice(0, 10);
  const snapshots = await Promise.all([
    storeSnapshot({ shopId, metricType: "DAILY_SALES", dateKey, payload: dailySales }),
    storeSnapshot({ shopId, metricType: "MERCHANT_COHORTS", dateKey, payload: cohorts }),
    storeSnapshot({ shopId, metricType: "REGIONAL_DEMAND", dateKey, payload: regionalDemand }),
    storeSnapshot({ shopId, metricType: "TREND_ANALYTICS", dateKey, payload: trends }),
  ]);

  return snapshots;
}

async function listWarehouseSnapshots({ shopId = null, metricType = null }) {
  const query = { ...(shopId ? { shopId } : {}) };
  if (metricType) query.metricType = String(metricType).trim().toUpperCase();
  return AnalyticsSnapshot.find(query).sort({ dateKey: -1, createdAt: -1 }).lean();
}

module.exports = {
  buildWarehouseSnapshots,
  listWarehouseSnapshots,
};
