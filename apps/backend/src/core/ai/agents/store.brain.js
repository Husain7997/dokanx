const ProductAgent = require("./product.agent");
const PricingAgent = require("./pricing.agent");
const MarketingAgent = require("./marketing.agent");
const RiskAgent = require("./risk.agent");
const CreditAgent = require("./credit.agent");

class StoreBrain {

  async operate(shopId) {

    console.log("🧠 Store Brain Activated:", shopId);

    await RiskAgent.scan(shopId);
    await ProductAgent.manage(shopId);
    await PricingAgent.adjust(shopId);
    await MarketingAgent.run(shopId);
    await CreditAgent.evaluate(shopId);

  }

}

module.exports = new StoreBrain();