const Campaign = require("../models/campaign.model");

exports.listCampaigns = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const campaigns = await Campaign.find({ shopId }).sort({ createdAt: -1 }).lean();
  res.json({ data: campaigns });
};

exports.createCampaign = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const { name, type, audience, scheduleAt } = req.body || {};
  if (!name) return res.status(400).json({ message: "name required" });

  const campaign = await Campaign.create({
    shopId,
    name,
    type: type || "PROMO",
    audience: audience || null,
    scheduleAt: scheduleAt || null,
  });

  res.status(201).json({ data: campaign });
};

exports.updateCampaign = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const { campaignId } = req.params;
  const { status, name, type, scheduleAt } = req.body || {};

  const campaign = await Campaign.findOneAndUpdate(
    { _id: campaignId, shopId },
    { ...(status ? { status } : {}), ...(name ? { name } : {}), ...(type ? { type } : {}), scheduleAt },
    { new: true }
  );

  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  res.json({ data: campaign });
};
