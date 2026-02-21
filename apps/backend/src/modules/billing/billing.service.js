const Subscription =
require("./subscription.model");

exports.getTenantPlan =
async (tenantId) => {

  return Subscription
   .findOne({ tenant: tenantId })
   .populate("plan");
};
