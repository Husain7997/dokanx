const Shipment = require("../models/shipment.model");

async function runShippingSync() {
  const shipments = await Shipment.find({
    status: { $in: ["CREATED", "IN_TRANSIT"] },
  }).limit(200);

  for (const shipment of shipments) {
    shipment.lastSyncedAt = new Date();
    if (!shipment.events?.length) {
      shipment.events = [];
    }
    shipment.events.push({
      status: shipment.status,
      message: "Sync heartbeat",
      timestamp: new Date(),
    });
    await shipment.save();
  }
}

module.exports = {
  runShippingSync,
};
