const { buildDailySalesAggregate } = require("./dailySalesAggregate.service");
const { buildMerchantCohorts } = require("./merchantCohort.service");
const { buildRegionalDemand } = require("./regionalDemand.service");
const { buildTrendAnalytics } = require("./trendAnalytics.service");

module.exports = {
  buildDailySalesAggregate,
  buildMerchantCohorts,
  buildRegionalDemand,
  buildTrendAnalytics,
};
