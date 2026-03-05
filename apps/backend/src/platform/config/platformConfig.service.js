const PlatformConfig = require("./platformConfig.model");

async function setConfig({ key, value, scope = "GLOBAL", tenantId = null, description = "" }) {
  return PlatformConfig.findOneAndUpdate(
    { key, scope, tenantId: tenantId || null },
    { $set: { value, description } },
    { upsert: true, returnDocument: "after" }
  );
}

async function getConfig({ key, tenantId = null, fallback = null }) {
  if (tenantId) {
    const tenantConfig = await PlatformConfig.findOne({
      key,
      scope: "TENANT",
      tenantId
    }).lean();
    if (tenantConfig) return tenantConfig.value;
  }

  const globalConfig = await PlatformConfig.findOne({
    key,
    scope: "GLOBAL",
    tenantId: null
  }).lean();

  return globalConfig ? globalConfig.value : fallback;
}

module.exports = {
  setConfig,
  getConfig
};
