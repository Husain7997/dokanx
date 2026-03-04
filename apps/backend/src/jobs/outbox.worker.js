const Outbox =
  require("../models/outbox.model");

const eventBus  =
  require("@/infrastructure/events/eventBus");

async function processOutbox() {

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