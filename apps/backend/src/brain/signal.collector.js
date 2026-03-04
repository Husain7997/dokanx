const { addJob } = require("@/core/infrastructure");
const { calcStockVelocity, calcRevenueTrend, calcRefundRate, detectOrderSpike } = require("./signal.calculators");
module.exports.collectSignals = async ({ shopId }) => {
   await addJob("collectSignals", { shopId });
  return {
    stockVelocity: await calcStockVelocity(shopId),
    revenueTrend: await calcRevenueTrend(shopId),
    refundRate: await calcRefundRate(shopId),
    orderSpike: await detectOrderSpike(shopId),
    

  };
 
};