const Campaign = require("../models/campaign.model");

function getShopId(req) {
  return req.shop?._id || req.user?.shopId;
}

exports.listCampaigns = async (req, res) => {
  const shopId = getShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const campaigns = await Campaign.find({ shopId }).sort({ createdAt: -1 }).lean();
  res.json({ data: campaigns });
};

exports.createCampaign = async (req, res) => {
  const shopId = getShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const { name, type, status, platform, channel, audience, scheduleAt, content, offerTitle, ctaLabel, redirectUrl, trackingCode, targetingSummary, autoMessage } = req.body || {};
  if (!name) return res.status(400).json({ message: "name required" });

  const campaign = await Campaign.create({
    shopId,
    name,
    type: type || "PROMO",
    status: status || "DRAFT",
    platform: platform || "FACEBOOK",
    channel: channel || "SOCIAL",
    audience: audience || null,
    scheduleAt: scheduleAt || null,
    content: content || "",
    offerTitle: offerTitle || "",
    ctaLabel: ctaLabel || "Shop now",
    redirectUrl: redirectUrl || "",
    trackingCode: trackingCode || `cmp-${Date.now()}`,
    targetingSummary: targetingSummary || "",
    autoMessage: autoMessage || "",
  });

  res.status(201).json({ data: campaign });
};

exports.updateCampaign = async (req, res) => {
  const shopId = getShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const { campaignId } = req.params;
  const updates = {};
  ["status", "name", "type", "platform", "channel", "scheduleAt", "content", "offerTitle", "ctaLabel", "redirectUrl", "trackingCode", "targetingSummary", "autoMessage", "audience"].forEach((key) => {
    if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  });

  const campaign = await Campaign.findOneAndUpdate(
    { _id: campaignId, shopId },
    updates,
    { returnDocument: "after" }
  );

  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  res.json({ data: campaign });
};

