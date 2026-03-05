const Outbox = require("@/models/outbox.model");
const PlatformEvent = require("./event.schema");
const { enqueueByEvent } = require("@/platform/queue/queues");
const { logger } = require("@/core/infrastructure");

async function dispatchOutboxBatch(limit = 100) {
  const rows = await Outbox.find({ processed: false })
    .sort({ createdAt: 1 })
    .limit(limit);

  for (const row of rows) {
    try {
      await enqueueByEvent(row.type, row.payload || {});
      row.processed = true;
      await row.save();

      if (row.eventId) {
        await PlatformEvent.updateOne(
          { _id: row.eventId },
          { $set: { status: "DISPATCHED", lastError: null } }
        );
      }
    } catch (err) {
      logger.error({ err: err.message, eventType: row.type }, "Outbox dispatch failed");
      if (row.eventId) {
        await PlatformEvent.updateOne(
          { _id: row.eventId },
          { $set: { status: "FAILED", lastError: err.message } }
        );
      }
    }
  }
}

module.exports = {
  dispatchOutboxBatch
};
