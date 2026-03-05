const PlatformEvent = require("./event.schema");

async function replayEvents({
  tenantId,
  eventName,
  from,
  to,
  limit = 1000
}) {
  const query = {};
  if (tenantId) query.tenantId = tenantId;
  if (eventName) query.eventName = eventName;
  if (from || to) {
    query.occurredAt = {};
    if (from) query.occurredAt.$gte = new Date(from);
    if (to) query.occurredAt.$lte = new Date(to);
  }

  return PlatformEvent.find(query)
    .sort({ occurredAt: 1 })
    .limit(limit)
    .lean();
}

module.exports = {
  replayEvents
};
