const IntelligenceMetric = require("@/models/IntelligenceMetric");
const { publishDomainEvent } = require("@/platform/events/event.publisher");

async function recordIntelligenceMetric({
  tenantId = null,
  metricType,
  latencyMs = 0,
  accuracyScore = null,
  metadata = {},
  persist = true,
}) {
  const payload = {
    tenantId,
    metricType: String(metricType || "").trim().toUpperCase(),
    latencyMs: Math.max(Number(latencyMs) || 0, 0),
    accuracyScore: accuracyScore === null ? null : Number(accuracyScore),
    metadata,
  };

  if (persist) {
    await IntelligenceMetric.create(payload);
  }

  await publishDomainEvent({
    eventName: "INTELLIGENCE_METRIC_RECORDED",
    tenantId,
    aggregateId: null,
    idempotencyKey: `intelligence_metric_${payload.metricType}_${tenantId || "global"}_${Date.now()}`,
    payload,
  }).catch(() => null);

  return payload;
}

module.exports = {
  recordIntelligenceMetric,
};
