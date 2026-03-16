const SystemSetting = require("../models/systemSetting.model");
const {
  ETA_SETTINGS_KEY,
  DEFAULT_ETA_SETTINGS,
  normalizeEtaSettings,
} = require("../utils/eta.util");

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
