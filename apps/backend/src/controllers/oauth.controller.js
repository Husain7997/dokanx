const Developer = require("../models/developer.model");
const OAuthApp = require("../models/oauthApp.model");
const OAuthAuthCode = require("../models/oauthAuthCode.model");
const OAuthToken = require("../models/oauthToken.model");
const { hashSecret, randomToken } = require("../utils/crypto.util");
const { createAudit } = require("../utils/audit.util");

const DEFAULT_SCOPES = [
  "read_products",
  "write_products",
  "read_orders",
  "write_orders",
  "read_customers",
  "write_customers",
  "read_inventory",
  "write_inventory",
];

exports.listApps = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const apps = await OAuthApp.find({ developerId: developer._id }).sort({ createdAt: -1 });
  res.json({ data: apps });
};

exports.createApp = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const { name, description, redirectUris, scopes } = req.body || {};
  if (!name) return res.status(400).json({ message: "App name is required" });

  const clientId = `dkx_app_${randomToken(16)}`;
  const clientSecret = `dkx_secret_${randomToken(24)}`;
  const clientSecretHash = hashSecret(clientSecret);

  const app = await OAuthApp.create({
    developerId: developer._id,
    name,
    description: description || "",
    redirectUris: Array.isArray(redirectUris) ? redirectUris : [],
    scopes: Array.isArray(scopes) && scopes.length ? scopes : DEFAULT_SCOPES,
    clientId,
    clientSecretHash,
  });

  res.status(201).json({
    message: "OAuth app created",
    data: app,
    clientSecret,
  });

  await createAudit({
    action: "CREATE_OAUTH_APP",
    performedBy: req.user?._id,
    targetType: "OAuthApp",
    targetId: app._id,
    req,
  });
};

exports.updateApp = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const { appId } = req.params;
  const { name, description, redirectUris, scopes, status } = req.body || {};

  const app = await OAuthApp.findOneAndUpdate(
    { _id: appId, developerId: developer._id },
    {
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      ...(Array.isArray(redirectUris) ? { redirectUris } : {}),
      ...(Array.isArray(scopes) ? { scopes } : {}),
      ...(status ? { status } : {}),
    },
    { new: true }
  );

  if (!app) return res.status(404).json({ message: "OAuth app not found" });

  res.json({ message: "OAuth app updated", data: app });

  await createAudit({
    action: "UPDATE_OAUTH_APP",
    performedBy: req.user?._id,
    targetType: "OAuthApp",
    targetId: app._id,
    req,
  });
};

exports.deleteApp = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const { appId } = req.params;
  const app = await OAuthApp.findOneAndDelete({ _id: appId, developerId: developer._id });
  if (!app) return res.status(404).json({ message: "OAuth app not found" });

  res.json({ message: "OAuth app deleted" });

  await createAudit({
    action: "DELETE_OAUTH_APP",
    performedBy: req.user?._id,
    targetType: "OAuthApp",
    targetId: app._id,
    req,
  });
};

exports.authorize = async (req, res) => {
  const { client_id, redirect_uri, scope, state } = req.query;
  if (!client_id || !redirect_uri) {
    return res.status(400).json({ message: "client_id and redirect_uri required" });
  }

  const app = await OAuthApp.findOne({ clientId: client_id });
  if (!app) return res.status(404).json({ message: "OAuth app not found" });

  if (!app.redirectUris.includes(String(redirect_uri))) {
    return res.status(400).json({ message: "Invalid redirect_uri" });
  }

  const requestedScopes = String(scope || "")
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

  const code = randomToken(20);
  await OAuthAuthCode.create({
    code,
    appId: app._id,
    userId: req.user._id,
    scopes: requestedScopes.length ? requestedScopes : app.scopes,
    redirectUri: String(redirect_uri),
    expiresAt: new Date(Date.now() + 1000 * 60 * 5),
  });

  res.json({
    code,
    redirectUri: redirect_uri,
    state: state || null,
  });
};

exports.consent = async (req, res) => {
  const { client_id, redirect_uri, scope } = req.query;
  if (!client_id || !redirect_uri) {
    return res.status(400).json({ message: "client_id and redirect_uri required" });
  }

  const app = await OAuthApp.findOne({ clientId: client_id });
  if (!app) return res.status(404).json({ message: "OAuth app not found" });
  if (!app.redirectUris.includes(String(redirect_uri))) {
    return res.status(400).json({ message: "Invalid redirect_uri" });
  }

  const requestedScopes = String(scope || "")
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

  res.json({
    data: {
      app: {
        name: app.name,
        description: app.description,
        clientId: app.clientId,
      },
      scopes: requestedScopes.length ? requestedScopes : app.scopes,
    },
  });
};

exports.token = async (req, res) => {
  const { grant_type } = req.body || {};
  if (grant_type === "authorization_code") {
    return exports.exchangeAuthorizationCode(req, res);
  }
  if (grant_type === "refresh_token") {
    return exports.refreshToken(req, res);
  }
  return res.status(400).json({ message: "Unsupported grant_type" });
};

exports.exchangeAuthorizationCode = async (req, res) => {
  const { code, client_id, client_secret, redirect_uri } = req.body || {};
  if (!code || !client_id || !client_secret || !redirect_uri) {
    return res.status(400).json({ message: "Missing token exchange parameters" });
  }

  const app = await OAuthApp.findOne({ clientId: client_id });
  if (!app) return res.status(404).json({ message: "OAuth app not found" });
  if (hashSecret(client_secret) !== app.clientSecretHash) {
    return res.status(401).json({ message: "Invalid client secret" });
  }

  const authCode = await OAuthAuthCode.findOne({ code, appId: app._id, redirectUri: redirect_uri });
  if (!authCode) return res.status(404).json({ message: "Invalid auth code" });

  await OAuthAuthCode.deleteOne({ _id: authCode._id });

  const accessToken = `atk_${randomToken(24)}`;
  const refreshToken = `rtk_${randomToken(24)}`;

  const token = await OAuthToken.create({
    accessToken,
    refreshToken,
    appId: app._id,
    userId: authCode.userId,
    scopes: authCode.scopes,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  });

  res.json({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: token.scopes.join(" "),
  });
};

exports.refreshToken = async (req, res) => {
  const { refresh_token, client_id, client_secret } = req.body || {};
  if (!refresh_token || !client_id || !client_secret) {
    return res.status(400).json({ message: "Missing refresh parameters" });
  }

  const app = await OAuthApp.findOne({ clientId: client_id });
  if (!app) return res.status(404).json({ message: "OAuth app not found" });
  if (hashSecret(client_secret) !== app.clientSecretHash) {
    return res.status(401).json({ message: "Invalid client secret" });
  }

  const existing = await OAuthToken.findOne({ refreshToken: refresh_token, appId: app._id });
  if (!existing) return res.status(404).json({ message: "Refresh token invalid" });

  const accessToken = `atk_${randomToken(24)}`;
  existing.accessToken = accessToken;
  existing.expiresAt = new Date(Date.now() + 1000 * 60 * 60);
  await existing.save();

  res.json({
    access_token: existing.accessToken,
    refresh_token: existing.refreshToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: existing.scopes.join(" "),
  });
};
