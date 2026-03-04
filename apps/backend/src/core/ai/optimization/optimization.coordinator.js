const PricingOptimizer = require("./pricing.optimizer");
const CashflowOptimizer = require("./cashflow.optimizer");
const InventoryOptimizer = require("./inventory.optimizer");
const MarketingOptimizer = require("./marketing.optimizer");
const HealthOptimizer = require("./health.optimizer");

class OptimizationCoordinator {

  async run(shopId) {
    console.log("🧠 Running Optimization Loop:", shopId);

    await HealthOptimizer.evaluate(shopId);
    await PricingOptimizer.optimize(shopId);
    await InventoryOptimizer.optimize(shopId);
    await CashflowOptimizer.optimize(shopId);
    await MarketingOptimizer.optimize(shopId);
  }

}

module.exports = new OptimizationCoordinator();