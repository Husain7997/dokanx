// src/infrastructure/events/eventBus.js

const { EventEmitter2 } = require("eventemitter2");

const eventBus = new EventEmitter2({
  wildcard: true,
  delimiter: ".",
});

module.exports = eventBus;