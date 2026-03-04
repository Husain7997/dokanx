const eventBus = require("@/infrastructure/events/eventBus");
const brain = require("./ai.brain");

function startAIObserver() {
  console.log("🧠 AI Observer started");

  eventBus.onAny(async (event, value) => {
    try {
      await brain.process(value);
    } catch (err) {
      console.error("AI error:", err.message);
    }
  });
}

module.exports = { startAIObserver };