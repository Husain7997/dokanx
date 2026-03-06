const {eventBus} = require("@/core/infrastructure");
const StoreBrain = require("./agents/store.brain");

class AutonomousEngine {
  constructor() {
    this.initialized = false;
  }

  start() {
    if (this.initialized) return;

    try {
      this.registerListeners();
      this.initialized = true;
      console.log("🤖 AI Operated Stores ENABLED");
    } catch (err) {
      console.error("Autonomous Engine Failed:", err);
    }
  }

  registerListeners() {
    eventBus.on("SHOP_ACTIVITY", async (event) => {
      await StoreBrain.operate(event.shopId);
    });
  }
}

module.exports = new AutonomousEngine();