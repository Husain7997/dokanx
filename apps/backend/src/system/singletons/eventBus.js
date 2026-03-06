const EventEmitter = require("events");

class DokanXEventBus extends EventEmitter {}

const eventBus = new DokanXEventBus();

module.exports = { eventBus };