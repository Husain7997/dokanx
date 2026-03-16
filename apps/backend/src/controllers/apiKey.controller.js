const Developer = require("../models/developer.model");
const ApiKey = require("../models/apiKey.model");
const { hashSecret, randomToken } = require("../utils/crypto.util");

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

  const { name, permissions, usageLimit, appId } = req.body || {};
  const rawKey = `dkx_${randomToken(24)}`;
  const keyHash = hashSecret(rawKey);

  const key = await ApiKey.create({
    developerId: developer._id,
    appId: appId || null,
    name: name || "Default key",
    keyHash,
    keyPreview: buildPreview(rawKey),
    permissions: Array.isArray(permissions) ? permissions : [],
    usageLimit: usageLimit ?? null,
    usageRemaining: usageLimit ?? null,
  });

  res.status(201).json({
    message: "API key created",
    data: key,
    secret: rawKey,
  });
};

exports.revokeKey = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const { keyId } = req.params;
  const key = await ApiKey.findOneAndUpdate(
    { _id: keyId, developerId: developer._id },
    { revokedAt: new Date() },
    { new: true }
  );

  if (!key) return res.status(404).json({ message: "API key not found" });

  res.json({ message: "API key revoked", data: key });
};
