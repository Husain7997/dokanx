const { addJob } = require("@/core/infrastructure");
const { collectSignalsForShop } = require("./analytics.handlers");
module.exports.collectSignals = async ({ shopId }) => {
  await addJob("collectSignals", { shopId }, { queueName: "analytics" });
  return collectSignalsForShop({ shopId });
};
