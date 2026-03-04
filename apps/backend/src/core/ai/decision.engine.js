const PolicyEngine = require("./policy.engine");

class DecisionEngine {

  async handleOrder(event) {
    const decision = await PolicyEngine.evaluateOrder(event);

    if (!decision.allowed) return;

    console.log("AI Decision:", decision.action);
  }

  async handleInventory(event) {
    const decision = await PolicyEngine.evaluateInventory(event);

    if (!decision.allowed) return;

    console.log("AI Reorder Triggered");
  }

  async handleCustomer(event) {
    const decision = await PolicyEngine.evaluateCustomer(event);

    if (!decision.allowed) return;

    console.log("AI Marketing Triggered");
  }
}

module.exports = new DecisionEngine();