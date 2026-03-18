const ApiUsage = require("../../models/apiUsage.model");
const ApiKey = require("../../models/apiKey.model");
const OAuthToken = require("../../models/oauthToken.model");
const OAuthApp = require("../../models/oauthApp.model");
const Developer = require("../../models/developer.model");
const AppInstallation = require("../../models/appInstallation.model");
const { redis } = require("../../core/infrastructure");
const { hashSecret } = require("../../utils/crypto.util");
const { recordPlatformAudit } = require("../platform-hardening/platform-audit.service");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function getApiKey(req) {
  return req.headers["x-api-key"] || req.headers["x-dokanx-api-key"] || null;
}

function getRequestedShopId(req) {
  return (
    req.headers["x-shop-id"] ||
    req.query.shopId ||
    req.body?.shopId ||
    req.tenant?._id ||
    null
  );
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
}

function isIpAllowed(ipWhitelist = [], ip = "") {
  if (!Array.isArray(ipWhitelist) || !ipWhitelist.length) return true;
  return ipWhitelist.includes(ip);
}

async function resolveApiKeyContext(rawKey) {
  if (!rawKey) return null;
  const keyHash = hashSecret(rawKey);
  const apiKey = await ApiKey.findOne({ keyHash, revokedAt: null }).lean();
  if (!apiKey) return null;
  const [developer, app] = await Promise.all([
    Developer.findById(apiKey.developerId).lean(),
    apiKey.appId ? OAuthApp.findById(apiKey.appId).lean() : Promise.resolve(null),
  ]);
  const isLegacy = Boolean(apiKey.legacy || (!apiKey.appId && !apiKey.shopId));
  const scopes = Array.isArray(apiKey.permissions) ? apiKey.permissions : [];
  return {
    type: "api_key",
    apiKey,
    app,
    developer,
    scopes: isLegacy ? scopes.filter((scope) => String(scope || "").startsWith("read_")) : scopes,
    sandboxMode: Boolean(apiKey.sandboxMode || app?.sandboxMode),
    legacy: isLegacy,
    rawCredential: rawKey,
  };
}

async function resolveOAuthContext(accessToken) {
  if (!accessToken) return null;
  const token = await OAuthToken.findOne({
    accessToken,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!token) return null;
  const app = await OAuthApp.findById(token.appId).lean();
  if (!app) return null;
  const developer = await Developer.findById(app.developerId).lean();
  return {
    type: "oauth",
    token,
    app,
    developer,
    scopes: Array.isArray(token.scopes) ? token.scopes : [],
    sandboxMode: Boolean(app.sandboxMode),
    legacy: false,
    rawCredential: accessToken,
  };
}

async function resolveAuthContext(req) {
  const rawKey = getApiKey(req);
  if (rawKey) return resolveApiKeyContext(rawKey);
  const bearer = getBearerToken(req);
  if (bearer) return resolveOAuthContext(bearer);
  return null;
}

async function incrementRateWindow(key, ttlSeconds) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
}

async function enforceRateLimit(identifier, limitPerMinute, limitPerDay) {
  const parsedMinute = Number(limitPerMinute || 60);
  const parsedDay = Number(limitPerDay || 5000);
  const minuteBucket = Math.floor(Date.now() / 60000);
  const dayBucket = new Date().toISOString().slice(0, 10);

  if (parsedMinute > 0) {
    const minuteCount = await incrementRateWindow(`rate:${identifier}:minute:${minuteBucket}`, 60);
    if (minuteCount > parsedMinute) {
      const error = new Error("Rate limit exceeded");
      error.statusCode = 429;
      throw error;
    }
  }

  if (parsedDay > 0) {
    const dayCount = await incrementRateWindow(`rate:${identifier}:day:${dayBucket}`, 86400);
    if (dayCount > parsedDay) {
      const error = new Error("Daily rate limit exceeded");
      error.statusCode = 429;
      throw error;
    }
  }
}

async function enforceReplayProtection(req) {
  const needsSignature = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (!needsSignature) return;

  const timestamp = req.headers["x-dokanx-timestamp"];
  const nonce = req.headers["x-dokanx-nonce"];
  const signature = req.headers["x-dokanx-signature"];
  if (!timestamp || !nonce || !signature) {
    const error = new Error("Signature, timestamp and nonce required");
    error.statusCode = 401;
    throw error;
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    const error = new Error("Request timestamp expired");
    error.statusCode = 401;
    throw error;
  }

  const replayKey = `replay:${nonce}`;
  const stored = await redis.set(replayKey, "1", "EX", 300, "NX");
  if (stored !== "OK") {
    const error = new Error("Replay attack detected");
    error.statusCode = 409;
    throw error;
  }
}

function validateRequestSignature(req, rawCredential) {
  const needsSignature = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (!needsSignature) return;
  const timestamp = req.headers["x-dokanx-timestamp"];
  const nonce = req.headers["x-dokanx-nonce"];
  const signature = req.headers["x-dokanx-signature"];
  const payload =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const base = [req.method, req.originalUrl, String(timestamp || ""), String(nonce || ""), payload].join(".");
  const expected = hashSecret(`${rawCredential}.${base}`);
  if (expected !== signature) {
    const error = new Error("Invalid request signature");
    error.statusCode = 401;
    throw error;
  }
}

async function resolveInstallation({ appId, shopId }) {
  if (!appId || !shopId) return null;
  return AppInstallation.findOne({
    appId,
    shopId,
    status: "INSTALLED",
  }).lean();
}

async function buildPlatformContext(req) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    const error = new Error("API key or OAuth token required");
    error.statusCode = 401;
    throw error;
  }

  const clientIp = getClientIp(req);
  const whitelist = auth.apiKey?.ipWhitelist || auth.app?.ipWhitelist || [];
  if (!isIpAllowed(whitelist, clientIp)) {
    const error = new Error("IP address not allowed");
    error.statusCode = 403;
    throw error;
  }

  const identifier = auth.apiKey?._id || auth.token?._id || auth.app?._id;
  const limitPerMinute =
    auth.apiKey?.rateLimitPerMinute ||
    auth.app?.rateLimitPerMinute ||
    Number(process.env.PUBLIC_API_RATE_LIMIT_PER_MINUTE || 60);
  const limitPerDay =
    auth.apiKey?.rateLimitPerDay ||
    auth.app?.rateLimitPerDay ||
    Number(process.env.PUBLIC_API_RATE_LIMIT_PER_DAY || 5000);
  await enforceRateLimit(String(identifier), limitPerMinute, limitPerDay);
  await enforceReplayProtection(req);
  validateRequestSignature(req, auth.rawCredential);

  const shopId = String(getRequestedShopId(req) || "");
  const installation = shopId
    ? await resolveInstallation({ appId: auth.app?._id, shopId })
    : null;

  if (auth.app && shopId && !installation && !auth.sandboxMode) {
    const error = new Error("App is not installed for this shop");
    error.statusCode = 403;
    throw error;
  }

  return {
    authType: auth.type,
    developerId: auth.developer?._id || auth.apiKey?.developerId || auth.app?.developerId || null,
    appId: auth.app?._id || auth.apiKey?.appId || auth.token?.appId || null,
    apiKeyId: auth.apiKey?._id || null,
    oauthTokenId: auth.token?._id || null,
    scopes: auth.scopes,
    legacy: Boolean(auth.legacy),
    sandboxMode: Boolean(auth.sandboxMode || installation?.sandboxMode),
    shopId: shopId || auth.apiKey?.shopId || installation?.shopId || null,
    installation,
    clientIp,
  };
}

function requireScopes(...requiredScopes) {
  return (req, res, next) => {
    const availableScopes = req.platformContext?.scopes || [];
    const allowed = requiredScopes.every((scope) => availableScopes.includes(scope));
    if (!allowed) {
      return res.status(403).json({ message: "Missing required scopes" });
    }
    return next();
  };
}

async function logGatewayUsage(req, statusCode) {
  const apiKeyId = req.platformContext?.apiKeyId;
  const date = new Date().toISOString().slice(0, 10);
  if (apiKeyId) {
    await ApiUsage.findOneAndUpdate(
      {
        apiKeyId,
        path: req.baseUrl + req.path,
        method: req.method,
        date,
      },
      {
        $inc: { count: 1 },
        $set: {
          lastStatusCode: statusCode,
        },
      },
      { upsert: true, new: true }
    );
    await ApiKey.updateOne(
      { _id: apiKeyId },
      {
        $set: {
          lastUsedAt: new Date(),
          lastUsedIp: req.platformContext?.clientIp || null,
        },
      }
    );
  }
  await recordPlatformAudit({
    action: "PUBLIC_API_REQUEST",
    category: "api_access",
    actorType: req.platformContext?.authType || "system",
    actorId: req.platformContext?.developerId || null,
    shopId: req.platformContext?.shopId || null,
    appId: req.platformContext?.appId || null,
    apiKeyId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    durationMs: req.platformRequestStartedAt ? Date.now() - req.platformRequestStartedAt : null,
    ip: req.platformContext?.clientIp || null,
    metadata: {
      legacy: Boolean(req.platformContext?.legacy),
      sandboxMode: Boolean(req.platformContext?.sandboxMode),
    },
  });
}

module.exports = {
  buildPlatformContext,
  requireScopes,
  logGatewayUsage,
};
