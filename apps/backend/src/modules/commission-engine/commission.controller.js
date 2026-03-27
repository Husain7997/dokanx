const commissionService = require("./commission.service");

exports.listRules = async (_req, res) => {
  const data = await commissionService.listRules();
  res.json({ data });
};

exports.upsertRule = async (req, res) => {
  const data = await commissionService.upsertRule(req.body || {});
  res.json({ data });
};
