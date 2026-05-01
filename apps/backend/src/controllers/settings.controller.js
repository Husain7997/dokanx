const SystemSetting = require("../models/systemSetting.model");
const { createAudit } = require("../utils/audit.util");
const {
  ETA_SETTINGS_KEY,
  DEFAULT_ETA_SETTINGS,
  normalizeEtaSettings,
} = require("../utils/eta.util");

const RISK_SETTINGS_KEY = "SECURITY_RISK_RULES";
const ADMIN_THRESHOLD_SETTINGS_KEY = "ADMIN_THRESHOLD_RULES";
const ADMIN_OPS_SETTINGS_KEY = "ADMIN_OPS_THRESHOLD_RULES";
const DEFAULT_RISK_SETTINGS = {
  highThreshold: 80,
  mediumThreshold: 50,
  tag: "Security",
};

const DEFAULT_THRESHOLD_SETTINGS = {
  warningStart: 1.2,
  warningEnd: 1.6,
  criticalStart: 1.6,
  criticalEnd: 2.2,
};

const DEFAULT_OPS_SETTINGS = {
  lagWatchMs: 60000,
  lagCriticalMs: 300000,
  queueWaitingWatch: 20,
  queueActiveWatch: 10,
  outboxPendingWatch: 50,
};

function normalizeRiskSettings(payload = {}) {
  const highThreshold = Number(payload.highThreshold ?? DEFAULT_RISK_SETTINGS.highThreshold);
  const mediumThreshold = Number(payload.mediumThreshold ?? DEFAULT_RISK_SETTINGS.mediumThreshold);
  const tag = String(payload.tag ?? DEFAULT_RISK_SETTINGS.tag);
  return { highThreshold, mediumThreshold, tag };
}

function validateRiskSettings(payload = {}) {
  const { highThreshold, mediumThreshold, tag } = payload;
  const errors = [];
  if (!Number.isFinite(highThreshold) || highThreshold < 0 || highThreshold > 100) {
    errors.push("highThreshold must be between 0 and 100");
  }
  if (!Number.isFinite(mediumThreshold) || mediumThreshold < 0 || mediumThreshold > 100) {
    errors.push("mediumThreshold must be between 0 and 100");
  }
  if (Number.isFinite(highThreshold) && Number.isFinite(mediumThreshold) && highThreshold < mediumThreshold) {
    errors.push("highThreshold must be >= mediumThreshold");
  }
  if (typeof tag !== "string" || tag.trim().length < 2 || tag.length > 24) {
    errors.push("tag must be 2-24 characters");
  }
  return errors;
}

function normalizeThresholdSettings(payload = {}) {
  const warningStart = Number(payload.warningStart ?? DEFAULT_THRESHOLD_SETTINGS.warningStart);
  const warningEnd = Number(payload.warningEnd ?? DEFAULT_THRESHOLD_SETTINGS.warningEnd);
  const criticalStart = Number(payload.criticalStart ?? DEFAULT_THRESHOLD_SETTINGS.criticalStart);
  const criticalEnd = Number(payload.criticalEnd ?? DEFAULT_THRESHOLD_SETTINGS.criticalEnd);

  if (![warningStart, warningEnd, criticalStart, criticalEnd].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Threshold values must be positive numbers.");
  }

  if (!(warningStart <= warningEnd && warningEnd <= criticalStart && criticalStart <= criticalEnd)) {
    throw new Error("Thresholds must be ordered: warningStart ≤ warningEnd ≤ criticalStart ≤ criticalEnd.");
  }

  return { warningStart, warningEnd, criticalStart, criticalEnd };
}

function normalizeOpsSettings(payload = {}) {
  const lagWatchMs = Number(payload.lagWatchMs ?? DEFAULT_OPS_SETTINGS.lagWatchMs);
  const lagCriticalMs = Number(payload.lagCriticalMs ?? DEFAULT_OPS_SETTINGS.lagCriticalMs);
  const queueWaitingWatch = Number(payload.queueWaitingWatch ?? DEFAULT_OPS_SETTINGS.queueWaitingWatch);
  const queueActiveWatch = Number(payload.queueActiveWatch ?? DEFAULT_OPS_SETTINGS.queueActiveWatch);
  const outboxPendingWatch = Number(payload.outboxPendingWatch ?? DEFAULT_OPS_SETTINGS.outboxPendingWatch);

  if (![lagWatchMs, lagCriticalMs, queueWaitingWatch, queueActiveWatch, outboxPendingWatch].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("Ops threshold values must be non-negative numbers.");
  }

  if (lagCriticalMs < lagWatchMs) {
    throw new Error("lagCriticalMs must be >= lagWatchMs.");
  }

  return {
    lagWatchMs,
    lagCriticalMs,
    queueWaitingWatch,
    queueActiveWatch,
    outboxPendingWatch,
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
    { returnDocument: "after", upsert: true }
  ).lean();
  res.json({ message: "ETA settings updated", data: updated?.value || payload });
};

exports.getRiskSettings = async (_req, res) => {
  const setting = await SystemSetting.findOne({ key: RISK_SETTINGS_KEY }).lean();
  const value = setting?.value ? normalizeRiskSettings(setting.value) : DEFAULT_RISK_SETTINGS;
  res.json({ data: value });
};

exports.updateRiskSettings = async (req, res) => {
  const payload = normalizeRiskSettings(req.body || {});
  const errors = validateRiskSettings(payload);
  if (errors.length) {
    return res.status(400).json({ message: "Invalid risk settings", errors });
  }

  const existing = await SystemSetting.findOne({ key: RISK_SETTINGS_KEY }).lean();
  let previous = DEFAULT_RISK_SETTINGS;
  try {
    if (existing?.value) {
      previous = normalizeRiskSettings(existing.value);
    }
  } catch {
    previous = DEFAULT_RISK_SETTINGS;
  }

  const updated = await SystemSetting.findOneAndUpdate(
    { key: RISK_SETTINGS_KEY },
    { value: payload, updatedBy: req.user?._id },
    { returnDocument: "after", upsert: true }
  ).lean();

  await createAudit({
    action: "ADMIN_RISK_SETTINGS_UPDATED",
    performedBy: req.user?._id,
    targetType: "SystemSetting",
    targetId: updated?._id,
    req,
    meta: {
      previous,
      next: payload,
    },
  });

  res.json({ message: "Risk settings updated", data: updated?.value || payload });
};

exports.getThresholdSettings = async (_req, res) => {
  const setting = await SystemSetting.findOne({ key: ADMIN_THRESHOLD_SETTINGS_KEY }).lean();
  const value = setting?.value ? normalizeThresholdSettings(setting.value) : DEFAULT_THRESHOLD_SETTINGS;
  res.json({ data: value });
};

exports.updateThresholdSettings = async (req, res) => {
  let payload;
  try {
    payload = normalizeThresholdSettings(req.body || {});
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid threshold payload." });
  }

  const existing = await SystemSetting.findOne({ key: ADMIN_THRESHOLD_SETTINGS_KEY }).lean();
  let previous = DEFAULT_THRESHOLD_SETTINGS;
  try {
    if (existing?.value) {
      previous = normalizeThresholdSettings(existing.value);
    }
  } catch {
    previous = DEFAULT_THRESHOLD_SETTINGS;
  }

  const updated = await SystemSetting.findOneAndUpdate(
    { key: ADMIN_THRESHOLD_SETTINGS_KEY },
    { value: payload, updatedBy: req.user?._id },
    { returnDocument: "after", upsert: true }
  ).lean();

  await createAudit({
    action: "ADMIN_THRESHOLD_UPDATED",
    performedBy: req.user?._id,
    targetType: "SystemSetting",
    targetId: updated?._id,
    req,
    meta: {
      previous,
      next: payload
    }
  });

  res.json({ message: "Threshold settings updated", data: updated?.value || payload });
};

exports.getOpsSettings = async (_req, res) => {
  const setting = await SystemSetting.findOne({ key: ADMIN_OPS_SETTINGS_KEY }).lean();
  const value = setting?.value ? normalizeOpsSettings(setting.value) : DEFAULT_OPS_SETTINGS;
  res.json({ data: value });
};

exports.updateOpsSettings = async (req, res) => {
  let payload;
  try {
    payload = normalizeOpsSettings(req.body || {});
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid ops threshold payload." });
  }

  const existing = await SystemSetting.findOne({ key: ADMIN_OPS_SETTINGS_KEY }).lean();
  let previous = DEFAULT_OPS_SETTINGS;
  try {
    if (existing?.value) {
      previous = normalizeOpsSettings(existing.value);
    }
  } catch {
    previous = DEFAULT_OPS_SETTINGS;
  }

  const updated = await SystemSetting.findOneAndUpdate(
    { key: ADMIN_OPS_SETTINGS_KEY },
    { value: payload, updatedBy: req.user?._id },
    { returnDocument: "after", upsert: true }
  ).lean();

  await createAudit({
    action: "ADMIN_OPS_THRESHOLD_UPDATED",
    performedBy: req.user?._id,
    targetType: "SystemSetting",
    targetId: updated?._id,
    req,
    meta: {
      previous,
      next: payload,
    },
  });

  res.json({ message: "Ops thresholds updated", data: updated?.value || payload });
};

