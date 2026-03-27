const { addJob } = require("@/core/infrastructure");
const { predictInventoryRiskFromSignals } = require("./analytics.handlers");

module.exports.predictInventoryRisk = (signals) => {
  const risk = predictInventoryRiskFromSignals(signals);
  void addJob("predictInventoryRisk", signals, { queueName: "analytics" });
  return risk;
};
