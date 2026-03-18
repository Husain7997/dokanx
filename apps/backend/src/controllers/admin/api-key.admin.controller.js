const ApiKey = require("../../models/apiKey.model");
const { createAudit } = require("../../utils/audit.util");

const READ_ONLY_SCOPES = [
  "read_products",
  "read_orders",
  "read_customers",
  "read_inventory",
  "read_wallet",
  "read_shipping",
  "read_shops",
];

exports.migrateLegacyKey = async (req, res) => {
  const { keyId, shopId, appId, rateLimitPerMinute, usageLimit } = req.body || {};
  if (!keyId) {
    return res.status(400).json({ message: "keyId required" });
  }

  const key = await ApiKey.findById(keyId);
  if (!key) {
    return res.status(404).json({ message: "API key not found" });
  }

  const isLegacy = Boolean(key.legacy || (!key.appId && !key.shopId));
  if (!isLegacy) {
    return res.json({ message: "API key already migrated", data: key });
  }

  key.appId = appId || key.appId || null;
  key.shopId = shopId || key.shopId || null;
  key.legacy = false;
  key.migrationStatus = "migrated";
  key.migratedAt = new Date();
  key.permissions = Array.isArray(key.permissions) && key.permissions.length
    ? key.permissions
    : READ_ONLY_SCOPES;
  if (typeof rateLimitPerMinute === "number") key.rateLimitPerMinute = rateLimitPerMinute;
  if (typeof usageLimit === "number") {
    key.usageLimit = usageLimit;
    key.usageRemaining = usageLimit;
  }
  await key.save();

  await createAudit({
    action: "MIGRATE_LEGACY_API_KEY",
    performedBy: req.user?._id,
    targetType: "ApiKey",
    targetId: key._id,
    req,
    meta: { shopId: key.shopId, appId: key.appId },
  });

  return res.json({ message: "API key migrated", data: key });
};
