const redis =
require("../redis/redis.client");

exports.isEnabled =
async (tenantId, feature) => {

  const key =
  `feature:${tenantId}:${feature}`;

  const flag = await redis.get(key);

  return flag === "true";
};
