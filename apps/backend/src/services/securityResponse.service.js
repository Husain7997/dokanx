const IpBlock = require("../models/ipBlock.model");
const SecurityEvent = require("../models/securityEvent.model");

function getSecurityConfig() {
  return {
    windowMs: Number(process.env.SECURITY_AUTOBLOCK_WINDOW_MS || 10 * 60 * 1000),
    blockMs: Number(process.env.SECURITY_AUTOBLOCK_DURATION_MS || 30 * 60 * 1000),
    authFailLimit: Number(process.env.SECURITY_AUTH_FAIL_LIMIT || 5),
    abuseFailLimit: Number(process.env.SECURITY_ABUSE_FAIL_LIMIT || 8),
  };
}

function getRequestIp(req) {
  return req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
}

function isSensitiveRoute(route = "") {
  return (
    route.startsWith("/api/auth") ||
    route.startsWith("/api/payments") ||
    route.startsWith("/api/admin") ||
    route.startsWith("/api/orders") ||
    route.startsWith("/api/wallet")
  );
}

async function logSecurityEvent({
  type,
  severity = "MEDIUM",
  req,
  userId = null,
  shopId = null,
  statusCode = null,
  metadata = null,
}) {
  return SecurityEvent.create({
    type,
    severity,
    ip: getRequestIp(req),
    userId,
    shopId,
    route: req?.originalUrl || req?.url || "",
    method: req?.method || "",
    statusCode,
    requestId: req?.requestId || null,
    fingerprint: req?.headers?.["x-device-fingerprint"] || null,
    userAgent: req?.headers?.["user-agent"] || "",
    metadata,
  });
}

async function countRecentEvents(ip, type, since) {
  return SecurityEvent.countDocuments({
    ip,
    type,
    createdAt: { $gte: since },
  });
}

async function autoBlockIp({ ip, reason, metadata = null }) {
  const { blockMs } = getSecurityConfig();
  const blockedUntil = new Date(Date.now() + blockMs);
  return IpBlock.findOneAndUpdate(
    { ip },
    {
      $set: {
        status: "BLOCKED",
        reason,
        blockedUntil,
        source: "AUTO",
        metadata,
      },
      $inc: { triggerCount: 1 },
    },
    { upsert: true, returnDocument: "after" }
  );
}

async function evaluateSecurityResponse({ req, type }) {
  const { windowMs, authFailLimit, abuseFailLimit } = getSecurityConfig();
  const ip = getRequestIp(req);
  if (!ip || ip === "unknown") return null;

  const since = new Date(Date.now() - windowMs);
  const count = await countRecentEvents(ip, type, since);
  const limit = type === "AUTH_LOGIN_FAILED" ? authFailLimit : abuseFailLimit;

  if (count < limit) {
    return null;
  }

  return autoBlockIp({
    ip,
    reason: type === "AUTH_LOGIN_FAILED" ? "Auto-block: repeated login failures" : "Auto-block: repeated suspicious API abuse",
    metadata: {
      type,
      eventCount: count,
      route: req?.originalUrl || req?.url || "",
      requestId: req?.requestId || null,
    },
  });
}

async function recordLoginFailure(req, metadata = null) {
  await logSecurityEvent({
    type: "AUTH_LOGIN_FAILED",
    severity: "HIGH",
    req,
    statusCode: 401,
    metadata,
  });
  return evaluateSecurityResponse({ req, type: "AUTH_LOGIN_FAILED" });
}

async function recordSuspiciousResponse(req, res) {
  const route = req?.originalUrl || req?.url || "";
  const statusCode = Number(res?.statusCode || 0);
  if (!isSensitiveRoute(route)) return null;
  if (![401, 403, 429].includes(statusCode)) return null;
  if (route.startsWith("/api/auth/login") && statusCode === 401) return null;

  const type = statusCode === 429 ? "API_RATE_LIMIT_HIT" : "API_ACCESS_DENIED";
  await logSecurityEvent({
    type,
    severity: statusCode === 429 ? "HIGH" : "MEDIUM",
    req,
    userId: req?.user?._id || null,
    shopId: req?.user?.shopId || req?.shop?._id || null,
    statusCode,
    metadata: {
      authUserId: req?.user?._id || null,
    },
  });

  return evaluateSecurityResponse({ req, type });
}

module.exports = {
  getRequestIp,
  logSecurityEvent,
  recordLoginFailure,
  recordSuspiciousResponse,
};
