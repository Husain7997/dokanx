const Outbox = require("@/models/outbox.model");
const PlatformEvent = require("./event.schema");
const { publishEvent, logger } = require("@/core/infrastructure");

async function publishDomainEvent({
  eventName,
  tenantId,
  aggregateId,
  idempotencyKey,
  payload = {},
  session = null
}) {
  if (!eventName || !idempotencyKey) {
    throw new Error("eventName and idempotencyKey are required");
  }

  const existing = await PlatformEvent.findOne({ idempotencyKey }).session(session);
  if (existing) return existing;

  const event = await PlatformEvent.create(
    [
      {
        eventName,
        tenantId,
        aggregateId: aggregateId ? String(aggregateId) : undefined,
        idempotencyKey: String(idempotencyKey),
        payload
      }
    ],
    session ? { session } : {}
  );

  await Outbox.create(
    [
      {
        type: eventName,
        eventId: event[0]._id,
        payload: {
          tenantId,
          aggregateId: aggregateId ? String(aggregateId) : undefined,
          idempotencyKey: String(idempotencyKey),
          data: payload
        },
        processed: false
      }
    ],
    session ? { session } : {}
  );

  publishEvent(eventName, payload);
  logger.info({ eventName, idempotencyKey }, "Domain event published");
  return event[0];
}

module.exports = {
  publishDomainEvent
};
