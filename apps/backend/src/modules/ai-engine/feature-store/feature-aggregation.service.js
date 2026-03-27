const AiFeatureSnapshot = require("../../../models/aiFeatureSnapshot.model");
const cache = require("../../../infrastructure/redis/cache.service");

const WINDOW_DAYS = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
};

function clampWindow(window) {
  return WINDOW_DAYS[window] ? window : "30d";
}

function buildDateKeys(window) {
  const days = WINDOW_DAYS[clampWindow(window)];
  const keys = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    keys.push(date.toISOString().slice(0, 10));
  }
  return keys;
}

function summarizeSnapshots(snapshots = []) {
  if (!snapshots.length) {
    return {
      numericAverages: {},
      coverageDays: 0,
      lastSnapshotAt: null,
      explanations: [],
    };
  }

  const totals = new Map();
  const counts = new Map();
  const explanations = [];

  snapshots.forEach((snapshot) => {
    Object.entries(snapshot.features || {}).forEach(([key, value]) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        totals.set(key, (totals.get(key) || 0) + value);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    (snapshot.explanations || []).slice(0, 2).forEach((item) => explanations.push(item));
  });

  const numericAverages = {};
  totals.forEach((value, key) => {
    numericAverages[key] = Number((value / Math.max(counts.get(key) || 1, 1)).toFixed(4));
  });

  return {
    numericAverages,
    coverageDays: snapshots.length,
    lastSnapshotAt: snapshots[0]?.snapshotTimestamp || snapshots[0]?.updatedAt || null,
    explanations: explanations.slice(0, 6),
  };
}

async function getRollingAggregate({ featureType, entityId, snapshotWindow = "30d", version = "v2" }) {
  const windowKey = clampWindow(snapshotWindow);
  const cacheKey = `ai:feature-aggregate:${featureType}:${entityId}:${windowKey}:${version}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const snapshotDates = buildDateKeys(windowKey);
  const snapshots = await AiFeatureSnapshot.find({
    featureType,
    entityId,
    version,
    snapshotWindow: windowKey,
    snapshotDate: { $in: snapshotDates },
  })
    .sort({ snapshotTimestamp: -1 })
    .lean();

  const summary = summarizeSnapshots(snapshots);
  await cache.set(cacheKey, summary, 3600);
  return summary;
}

module.exports = {
  WINDOW_DAYS,
  clampWindow,
  getRollingAggregate,
};
