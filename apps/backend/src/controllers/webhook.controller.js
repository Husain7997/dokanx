const Developer = require("../models/developer.model");
const WebhookSubscription = require("../models/webhookSubscription.model");
const { encryptSecret, randomToken } = require("../utils/crypto.util");
const { createAudit } = require("../utils/audit.util");

exports.listWebhooks = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const hooks = await WebhookSubscription.find({ developerId: developer._id }).sort({ createdAt: -1 });
  res.json({ data: hooks });
};

exports.createWebhook = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const { url, events, appId } = req.body || {};
  if (!url) return res.status(400).json({ message: "Webhook url required" });

  const secret = `whsec_${randomToken(20)}`;
  const { cipher, iv } = encryptSecret(secret);

  const hook = await WebhookSubscription.create({
    developerId: developer._id,
    appId: appId || null,
    url,
    events: Array.isArray(events) ? events : [],
    secretCipher: cipher,
    secretIv: iv,
  });

  res.status(201).json({
    message: "Webhook created",
    data: hook,
    secret,
  });

  await createAudit({
    action: "CREATE_WEBHOOK",
    performedBy: req.user?._id,
    targetType: "WebhookSubscription",
    targetId: hook._id,
    req,
  });
};

exports.deleteWebhook = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const { webhookId } = req.params;
  const hook = await WebhookSubscription.findOneAndDelete({
    _id: webhookId,
    developerId: developer._id,
  });

  if (!hook) return res.status(404).json({ message: "Webhook not found" });

  res.json({ message: "Webhook deleted" });

  await createAudit({
    action: "DELETE_WEBHOOK",
    performedBy: req.user?._id,
    targetType: "WebhookSubscription",
    targetId: hook._id,
    req,
  });
};
