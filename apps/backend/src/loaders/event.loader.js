const {eventBus} = require("@/core/infrastructure");

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