const Outbox =
  require("../models/outbox.model");

const {eventBus} = require("@/core/infrastructure");
const { dispatchOutboxBatch } =
  require("@/platform/events/outbox.dispatcher");

async function processOutbox() {
  await dispatchOutboxBatch(100);

  const events =
    await Outbox.find({
      processed: false,
    }).limit(50);

  for (const e of events) {

    try {

      eventBus.emit(
        e.type,
        e.payload
      );

      e.processed = true;

      await e.save();

    } catch (err) {

      console.error(
        "Outbox dispatch failed",
        err
      );
    }
  }
}

module.exports = {processOutbox};
