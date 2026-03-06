// src/core/ai/agents/ai.observer.js

const { eventBus } = require("@/core/infrastructure");

function startAIObserver() {
  console.log("🧠 AI Observer started");

  const originalEmit = eventBus.emit;

  eventBus.emit = function (eventName, ...args) {
    console.log(`🤖 AI Observed Event: ${eventName}`);
    return originalEmit.call(this, eventName, ...args);
  };
}

module.exports = { startAIObserver };