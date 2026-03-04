const { addJob } = require("@/core/infrastructure");

module.exports.predictInventoryRisk = (signals) => {
  if (signals.stockVelocity > 20 && signals.remainingStock < 5)
    return "OUT_OF_STOCK_SOON";

await addJob("predictInventoryRisk", signals);
  return "HEALTHY";
};