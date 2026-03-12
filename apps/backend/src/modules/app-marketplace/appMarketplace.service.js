const crypto = require("crypto");
const MarketplaceApp = require("./models/app.model");
const MarketplaceDeveloper = require("./models/developer.model");
const AppInstallation = require("./models/appInstallation.model");
const AppToken = require("./models/appToken.model");
const AuditLog = require("@/models/audit.model");
const { registerWebhook, listWebhooks } = require("./webhookDelivery.service");

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function randomToken(size = 24) {
  return crypto.randomBytes(size).toString("hex");
}

function sanitizeApp(row) {
  if (!row) return null;
  const data = typeof row.toObject === "function" ? row.toObject() : { ...row };
  if (data.oauth?.clientSecretHash) delete data.oauth.clientSecretHash;
  return data;
}

async function ensureDeveloperProfile({ userId, payload }) {
  const row = await MarketplaceDeveloper.findOneAndUpdate(
    { userId },
    {
      $set: {
        name: String(payload.name || "").trim(),
        companyName: String(payload.companyName || "").trim(),
        email: String(payload.email || "").trim().toLowerCase(),
        website: String(payload.website || "").trim(),
        status: "ACTIVE",
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  await AuditLog.create({
    action: "APP_DEVELOPER_PROFILE_UPSERTED",
    performedBy: userId || null,
    targetType: "MarketplaceDeveloper",
    targetId: row?._id || null,
    ip: "SYSTEM",
    userAgent: "SYSTEM",
  });
  return row;
}

async function listApps({ status = "PUBLISHED", type = null, limit = 50 }) {
  const query = {};
  if (status) query.status = asUpper(status);
  if (type) query.type = asUpper(type);

  const rows = await MarketplaceApp.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();

  return rows.map(sanitizeApp);
}

async function createApp({ actorId, payload }) {
  const developer = await MarketplaceDeveloper.findOne({ userId: actorId });
  if (!developer) {
    const err = new Error("Developer profile not found");
    err.statusCode = 404;
    throw err;
  }

  const clientId = randomToken(12);
  const clientSecret = randomToken(24);
  const app = await MarketplaceApp.create({
    developerId: developer._id,
    name: String(payload.name || "").trim(),
    slug: String(payload.slug || "").trim().toLowerCase(),
    type: asUpper(payload.type),
    description: String(payload.description || "").trim(),
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    webhookEvents: Array.isArray(payload.webhookEvents) ? payload.webhookEvents : [],
    status: asUpper(payload.status || "DRAFT"),
    isPublic: payload.isPublic === true,
    pricing: {
      model: asUpper(payload?.pricing?.model || "FREE"),
      amount: Number(payload?.pricing?.amount || 0),
      currency: String(payload?.pricing?.currency || "BDT").trim().toUpperCase(),
    },
    oauth: {
      clientId,
      clientSecretHash: hashToken(clientSecret),
      redirectUris: Array.isArray(payload?.oauth?.redirectUris) ? payload.oauth.redirectUris : [],
    },
    createdBy: actorId || null,
  });

  const result = sanitizeApp(app);
  result.oauth = {
    ...(result.oauth || {}),
    clientSecret,
  };
  await AuditLog.create({
    action: "APP_CREATED",
    performedBy: actorId || null,
    targetType: "MarketplaceApp",
    targetId: app._id,
    ip: "SYSTEM",
    userAgent: "SYSTEM",
  });
  return result;
}

async function installApp({ shopId, actorId, appId, payload = {} }) {
  const app = await MarketplaceApp.findOne({
    _id: appId,
    status: "PUBLISHED",
  }).lean();

  if (!app) {
    const err = new Error("App not found");
    err.statusCode = 404;
    throw err;
  }

  const grantedPermissions = (Array.isArray(payload.permissions) ? payload.permissions : app.permissions || [])
    .filter(permission => (app.permissions || []).includes(permission));

  const row = await AppInstallation.findOneAndUpdate(
    { shopId, appId: app._id },
    {
      $set: {
        status: "ACTIVE",
        grantedPermissions,
        installedBy: actorId || null,
        installedAt: new Date(),
        uninstalledAt: null,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  await AuditLog.create({
    action: "APP_INSTALLED",
    performedBy: actorId || null,
    targetType: "AppInstallation",
    targetId: row?._id || null,
    ip: "SYSTEM",
    userAgent: "SYSTEM",
  });
  return row;
}

async function listInstallations({ shopId }) {
  return AppInstallation.find({ shopId, status: "ACTIVE" })
    .populate("appId")
    .sort({ createdAt: -1 })
    .lean();
}

async function authorizeApp({ shopId, actorId, query }) {
  const app = await MarketplaceApp.findOne({ _id: query.appId, status: "PUBLISHED" }).select("+oauth.clientSecretHash");
  if (!app) {
    const err = new Error("App not found");
    err.statusCode = 404;
    throw err;
  }

  const installation = await AppInstallation.findOne({
    shopId,
    appId: app._id,
    status: "ACTIVE",
  });

  if (!installation) {
    const err = new Error("App is not installed for this shop");
    err.statusCode = 400;
    throw err;
  }

  const redirectUri = String(query.redirectUri || "").trim();
  if (!(app.oauth?.redirectUris || []).includes(redirectUri)) {
    const err = new Error("redirectUri is not allowed");
    err.statusCode = 400;
    throw err;
  }

  const code = randomToken(16);
  await AppToken.create({
    appId: app._id,
    shopId,
    installationId: installation._id,
    tokenType: "AUTH_CODE",
    tokenHash: hashToken(code),
    scopes: installation.grantedPermissions || [],
    redirectUri,
    actorId: actorId || null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  return {
    code,
    redirectUri,
    scopes: installation.grantedPermissions || [],
  };
}

async function exchangeToken({ payload }) {
  const app = await MarketplaceApp.findOne({
    _id: payload.appId,
    "oauth.clientId": payload.clientId,
  }).select("+oauth.clientSecretHash");

  if (!app) {
    const err = new Error("App not found");
    err.statusCode = 404;
    throw err;
  }

  if (app.oauth.clientSecretHash !== hashToken(payload.clientSecret)) {
    const err = new Error("Invalid client credentials");
    err.statusCode = 401;
    throw err;
  }

  const authCode = await AppToken.findOne({
    appId: app._id,
    tokenType: "AUTH_CODE",
    tokenHash: hashToken(payload.code),
    consumedAt: null,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select("+tokenHash");

  if (!authCode) {
    const err = new Error("Authorization code invalid or expired");
    err.statusCode = 401;
    throw err;
  }

  const accessToken = randomToken(24);
  const refreshToken = randomToken(24);

  authCode.consumedAt = new Date();
  await authCode.save();

  await AppToken.create({
    appId: app._id,
    shopId: authCode.shopId,
    installationId: authCode.installationId,
    tokenType: "ACCESS",
    tokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
    scopes: authCode.scopes || [],
    redirectUri: authCode.redirectUri || "",
    actorId: authCode.actorId || null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: 24 * 60 * 60,
    scopes: authCode.scopes || [],
  };
}

async function createWebhook({ shopId, actorId, appId, payload }) {
  const installation = await AppInstallation.findOne({
    shopId,
    appId,
    status: "ACTIVE",
  }).lean();

  if (!installation) {
    const err = new Error("App is not installed for this shop");
    err.statusCode = 400;
    throw err;
  }

  const result = await registerWebhook({
    appId,
    shopId,
    actorId,
    payload,
  });

  await AuditLog.create({
    action: "APP_WEBHOOK_REGISTERED",
    performedBy: actorId || null,
    targetType: "AppWebhook",
    targetId: result.webhook?._id || null,
    ip: "SYSTEM",
    userAgent: "SYSTEM",
  });

  return result;
}

module.exports = {
  ensureDeveloperProfile,
  listApps,
  createApp,
  installApp,
  listInstallations,
  authorizeApp,
  exchangeToken,
  createWebhook,
  listWebhooks,
  _internals: {
    hashToken,
    randomToken,
    sanitizeApp,
  },
};
