const Outbox =
  require("../models/outbox.model");

const eventBus  =
  require("@/infrastructure/events/eventBus");

const OUTBOX_STALE_MS = Number(process.env.OUTBOX_STALE_MS || 60 * 1000);
const OUTBOX_BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 50);

async function claimOutboxEvent(workerId) {
  const staleBefore = new Date(Date.now() - OUTBOX_STALE_MS);
  return Outbox.findOneAndUpdate(
    {
      processed: false,
      $or: [
        { processingAt: null },
        { processingAt: { $lte: staleBefore } },
      ],
    },
    {
      $set: {
        processingAt: new Date(),
        processingBy: workerId,
        lastError: null,
      },
    },
    {
      sort: { createdAt: 1, _id: 1 },
      returnDocument: "after",
    }
  );
}

async function processOutbox() {
  const workerId = `outbox-${process.pid}`;
  for (let index = 0; index < OUTBOX_BATCH_SIZE; index += 1) {
    const e = await claimOutboxEvent(workerId);
    if (!e) {
      break;
    }

    try {
      await eventBus.emitAsync(
        e.type,
        e.payload
      );
      e.processed = true;
      e.processedAt = new Date();
      e.processingAt = null;
      e.processingBy = null;
      e.lastError = null;
      await e.save();

    } catch (err) {
      e.retryCount = Number(e.retryCount || 0) + 1;
      e.processingAt = null;
      e.processingBy = null;
      e.lastError = err?.message || "Unknown outbox dispatch error";
      await e.save();
      console.error(
        "Outbox dispatch failed",
        err
      );
    }
  }
}

module.exports = {processOutbox};

