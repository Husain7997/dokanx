const automationService = require("../services/automation.service");

function getShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

exports.listRules = async (req, res) => {
  const shopId = getShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const rules = await automationService.listRules(shopId);
  res.json({ data: rules });
};

exports.createRule = async (req, res) => {
  const shopId = getShopId(req);
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const rule = await automationService.createRule(shopId, req.body || {});
  res.status(201).json({ data: rule });
};
