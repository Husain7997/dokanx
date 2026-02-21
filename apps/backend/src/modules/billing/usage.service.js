const Usage = require("./usage.model");

exports.increment =
async (tenantId, metric) => {

  await Usage.findOneAndUpdate(
    { tenant: tenantId, metric },
    { $inc: { count: 1 } },
    { upsert: true }
  );
};
