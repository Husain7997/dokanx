const Outbox =
require("@/models/outbox.model");

const {
  applyProjection
} =
require("./inventory.projection.worker");

async function runInventoryProjection() {

  const events =
    await Outbox.find({
      type: "INVENTORY_MUTATION",
      processed: false
    }).limit(50);

  for (const event of events) {

    await applyProjection(event);

    event.processed = true;
    await event.save();

  }

}

module.exports = {
  runInventoryProjection
};