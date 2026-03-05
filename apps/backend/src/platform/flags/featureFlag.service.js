const { redisClient } = require("@/core/infrastructure");
const { getConfig } = require("@/platform/config/platformConfig.service");

async function isFeatureEnabled(featureKey, tenantId = null, defaultValue = false) {
  const cacheKey = tenantId
    ? `flag:${tenantId}:${featureKey}`
    : `flag:global:${featureKey}`;

  const cached = await redisClient.get(cacheKey);
  if (cached !== null) return cached === "true";

  const value = await getConfig({
    key: `feature.${featureKey}`,
    tenantId,
    fallback: defaultValue
  });

  await redisClient.set(cacheKey, String(Boolean(value)), "EX", 60);
  return Boolean(value);
}

module.exports = {
  isFeatureEnabled
};
