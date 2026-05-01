const Developer = require("../models/developer.model");
const ApiKey = require("../models/apiKey.model");
const { encryptSecret, hashSecret, randomToken } = require("../utils/crypto.util");
const { createAudit } = require("../utils/audit.util");

function buildPreview(rawKey) {
  const suffix = rawKey.slice(-6);
  return `dkx_***${suffix}`;
}

exports.listKeys = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const keys = await ApiKey.find({ developerId: developer._id }).sort({ createdAt: -1 });
  res.json({ data: keys });
};

exports.createKey = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const { name, permissions, usageLimit, appId, sandboxMode, ipWhitelist, rateLimitPerMinute, rateLimitPerDay, shopId } = req.body || {};
  const rawKey = `dkx_${randomToken(24)}`;
  const signingSecret = `sig_${randomToken(24)}`;
  const keyHash = hashSecret(rawKey);
  const encryptedSigningSecret = encryptSecret(signingSecret);
  const isLegacy = !appId && !shopId;

  const key = await ApiKey.create({
    developerId: developer._id,
    appId: appId || null,
    legacy: isLegacy,
    migrationStatus: isLegacy ? "legacy" : "migrated",
    migratedAt: isLegacy ? null : new Date(),
    name: name || "Default key",
    keyHash,
    keyPreview: buildPreview(rawKey),
    signingSecretCipher: encryptedSigningSecret.cipher,
    signingSecretIv: encryptedSigningSecret.iv,
    permissions: Array.isArray(permissions) ? permissions : [],
    shopId: shopId || null,
    sandboxMode: Boolean(sandboxMode),
    ipWhitelist: Array.isArray(ipWhitelist) ? ipWhitelist : [],
    rateLimitPerMinute: Number(rateLimitPerMinute || 60),
    rateLimitPerDay: Number(rateLimitPerDay || 5000),
    usageLimit: usageLimit ?? null,
    usageRemaining: usageLimit ?? null,
  });

  res.status(201).json({
    message: "API key created",
    data: key,
    secret: rawKey,
    signingSecret,
  });

  await createAudit({
    action: "CREATE_API_KEY",
    performedBy: req.user?._id,
    targetType: "ApiKey",
    targetId: key._id,
    req,
  });
};

exports.revokeKey = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const { keyId } = req.params;
  const key = await ApiKey.findOneAndUpdate(
    { _id: keyId, developerId: developer._id },
    { revokedAt: new Date() },
    { returnDocument: "after" }
  );

  if (!key) return res.status(404).json({ message: "API key not found" });

  res.json({ message: "API key revoked", data: key });

  await createAudit({
    action: "REVOKE_API_KEY",
    performedBy: req.user?._id,
    targetType: "ApiKey",
    targetId: key._id,
    req,
  });
};

