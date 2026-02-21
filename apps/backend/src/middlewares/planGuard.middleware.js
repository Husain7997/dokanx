const billing =
require("../modules/billing/billing.service");

module.exports =
(featureName) =>
async (req, res, next) => {

  const tenantId = req.tenant;

  const subscription =
  await billing.getTenantPlan(tenantId);

  if (
   !subscription?.plan?.features?.[featureName]
  ) {
    return res.status(403).json({
      message:
      "Feature not available in your plan",
    });
  }

  next();
};
