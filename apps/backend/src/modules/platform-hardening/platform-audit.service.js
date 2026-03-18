const PlatformAuditLog = require("../../models/audit-log.model");

async function recordPlatformAudit({
  action,
  category = "api_access",
  actorType = "system",
  actorId = null,
  shopId = null,
  appId = null,
  apiKeyId = null,
  method = null,
  path = null,
  statusCode = null,
  durationMs = null,
  ip = null,
  metadata = {},
}) {
  try {
    await PlatformAuditLog.create({
      action,
      category,
      actorType,
      actorId,
      shopId,
      appId,
      apiKeyId,
      method,
      path,
      statusCode,
      durationMs,
      ip,
      metadata,
    });
  } catch (_error) {
    // Audit writes should never break the main request flow.
  }
}

module.exports = {
  recordPlatformAudit,
};
