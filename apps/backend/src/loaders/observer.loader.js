const {eventBus} = require("@/core/infrastructure");

const observer =
require("../system/observer/system.observer");

module.exports = () => {
  const originalEmit = eventBus.emit.bind(eventBus);

  eventBus.emit = (eventName, ...args) => {
    try {
      observer.observe(eventName, ...args);
    } catch (err) {
      console.error("Observer error:", err.message);
    }
    return originalEmit(eventName, ...args);
  };
};
