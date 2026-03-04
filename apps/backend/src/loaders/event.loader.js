const  eventBus  =
require("../infrastructure/events/eventBus");

const {
  handleInventoryReserved,
} = require("../listeners/inventory.listener");

function loadEvents() {

  eventBus.on(
    "INVENTORY_RESERVED",
    handleInventoryReserved
  );

  console.log("✅ Events Loaded");
}

module.exports = loadEvents;