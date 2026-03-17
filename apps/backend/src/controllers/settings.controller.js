const SystemSetting = require("../models/systemSetting.model");
const {
  ETA_SETTINGS_KEY,
  DEFAULT_ETA_SETTINGS,
  normalizeEtaSettings,
} = require("../utils/eta.util");

const RISK_SETTINGS_KEY = "SECURITY_RISK_RULES";
const DEFAULT_RISK_SETTINGS = {
  highThreshold: 80,
  mediumThreshold: 50,
  tag: "Security",
};

function normalizeRiskSettings(payload = {}) {
  return {
    highThreshold: Number(payload.highThreshold ?? DEFAULT_RISK_SETTINGS.highThreshold),
    mediumThreshold: Number(payload.mediumThreshold ?? DEFAULT_RISK_SETTINGS.mediumThreshold),
    tag: String(payload.tag ?? DEFAULT_RISK_SETTINGS.tag),
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

exports.getRiskSettings = async (_req, res) => {
  const setting = await SystemSetting.findOne({ key: RISK_SETTINGS_KEY }).lean();
  const value = setting?.value ? normalizeRiskSettings(setting.value) : DEFAULT_RISK_SETTINGS;
  res.json({ data: value });
};

exports.updateRiskSettings = async (req, res) => {
  const payload = normalizeRiskSettings(req.body || {});
  const updated = await SystemSetting.findOneAndUpdate(
    { key: RISK_SETTINGS_KEY },
    { value: payload, updatedBy: req.user?._id },
    { new: true, upsert: true }
  ).lean();
  res.json({ message: "Risk settings updated", data: updated?.value || payload });
};
