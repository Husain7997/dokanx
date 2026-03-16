const SystemSetting = require("../models/systemSetting.model");

const ETA_SETTINGS_KEY = "ETA_SETTINGS";

const DEFAULT_ETA_SETTINGS = {
  basePerKm: 10,
  minEta: 15,
  fallbackEta: 45,
  trafficFactors: [
    { maxDistanceKm: 2, minutes: 8 },
    { maxDistanceKm: 5, minutes: 12 },
    { maxDistanceKm: 10, minutes: 18 },
    { maxDistanceKm: 999, minutes: 24 },
  ],
  distanceBrackets: [
    { maxDistanceKm: 2, minutes: 5 },
    { maxDistanceKm: 5, minutes: 8 },
    { maxDistanceKm: 10, minutes: 12 },
    { maxDistanceKm: 999, minutes: 18 },
  ],
};

function normalizeBrackets(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      maxDistanceKm: Number(row?.maxDistanceKm),
      minutes: Number(row?.minutes),
    }))
    .filter((row) => Number.isFinite(row.maxDistanceKm) && Number.isFinite(row.minutes))
    .sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
}

function normalizeEtaSettings(payload = {}) {
  const trafficFactors = normalizeBrackets(payload.trafficFactors);
  const distanceBrackets = normalizeBrackets(payload.distanceBrackets);

  return {
    basePerKm: Number.isFinite(Number(payload.basePerKm)) ? Number(payload.basePerKm) : DEFAULT_ETA_SETTINGS.basePerKm,
    minEta: Number.isFinite(Number(payload.minEta)) ? Number(payload.minEta) : DEFAULT_ETA_SETTINGS.minEta,
    fallbackEta: Number.isFinite(Number(payload.fallbackEta)) ? Number(payload.fallbackEta) : DEFAULT_ETA_SETTINGS.fallbackEta,
    trafficFactors: trafficFactors.length ? trafficFactors : DEFAULT_ETA_SETTINGS.trafficFactors,
    distanceBrackets: distanceBrackets.length ? distanceBrackets : DEFAULT_ETA_SETTINGS.distanceBrackets,
  };
}

exports.getEtaSettings = async (_req, res) => {
  const setting = await SystemSetting.findOne({ key: ETA_SETTINGS_KEY }).lean();
  const value = setting?.value ? normalizeEtaSettings(setting.value) : DEFAULT_ETA_SETTINGS;
  res.json({ data: value });
};

exports.updateEtaSettings = async (req, res) => {
  const payload = normalizeEtaSettings(req.body || {});
  const updated = await SystemSetting.findOneAndUpdate(
    { key: ETA_SETTINGS_KEY },
    { value: payload, updatedBy: req.user?._id },
    { new: true, upsert: true }
  ).lean();
  res.json({ message: "ETA settings updated", data: updated?.value || payload });
};
