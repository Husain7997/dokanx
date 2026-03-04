const { redis } = require("@/core/infrastructure");

exports.isEnabled =
async (tenantId, feature) => {

  const key =
  `feature:${tenantId}:${feature}`;

  const flag = await redis.get(key);

  return flag === "true";
};
