const { generateMerchantAssistantAdvice } = require("@/intelligence/merchantAssistant.service");

async function getMerchantDashboardAdvisory(payload = {}) {
  return generateMerchantAssistantAdvice(payload);
}

module.exports = {
  getMerchantDashboardAdvisory,
};
