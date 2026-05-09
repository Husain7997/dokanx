const eventBus = require("../infrastructure/events/eventBus");
const automationService = require("./automation.service");

function emitEvent(type, payload = {}) {
  const event = {
    type,
    payload,
    emittedAt: new Date(),
  };
  eventBus.emit(type, payload);
  setImmediate(() => {
    automationService.processEvent(event).catch((error) => {
      console.error("AUTOMATION_EVENT_FAILED", { type, error: error.message });
    });
  });
  return event;
}

module.exports = {
  emitEvent,
};
