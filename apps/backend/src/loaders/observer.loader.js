const { eventBus } =
require("../infrastructure/events/eventBus");

const observer =
require("../system/observer/system.observer");

module.exports = () => {
  eventBus.onAny(e =>
    observer.observe(e)
  );
};