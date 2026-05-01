const Shop = require("../models/shop.model");
const Order = require("../models/order.model");
const Outbox = require("../models/outbox.model");
const { getQueueStatus } = require("@/core/infrastructure");
const {
  createReadCountQuery,
  createReadQuery,
} = require("../infrastructure/database/mongo.client");

function escapeLabel(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function pushMetric(lines, name, help, type, value, labels = {}) {
  if (help) lines.push(`# HELP ${name} ${help}`);
  if (type) lines.push(`# TYPE ${name} ${type}`);

  const entries = Object.entries(labels);
  const labelText = entries.length
    ? `{${entries.map(([key, labelValue]) => `${key}="${escapeLabel(labelValue)}"`).join(",")}}`
    : "";

  lines.push(`${name}${labelText} ${Number.isFinite(Number(value)) ? Number(value) : 0}`);
}

function buildPrometheusPayload(metrics) {
  const lines = [];

  pushMetric(lines, "dokanx_shops_total", "Total shops known to DokanX", "gauge", metrics.shops);
  pushMetric(lines, "dokanx_orders_total", "Total orders known to DokanX", "gauge", metrics.orders);

  Object.entries(metrics.queues || {}).forEach(([queueName, queueMetrics]) => {
    Object.entries(queueMetrics?.counts || {}).forEach(([state, value]) => {
      pushMetric(
        lines,
        "dokanx_queue_jobs",
        "Queue job counts by queue and state",
        "gauge",
        value,
        { queue: queueName, state }
      );
    });

    Object.entries(queueMetrics?.deadLetter || {}).forEach(([state, value]) => {
      pushMetric(
        lines,
        "dokanx_queue_dead_letter_jobs",
        "Dead-letter queue counts by queue and state",
        "gauge",
        value,
        { queue: queueName, state }
      );
    });

    pushMetric(
      lines,
      "dokanx_queue_oldest_waiting_ms",
      "Age in milliseconds of the oldest waiting job in each queue",
      "gauge",
      queueMetrics?.oldestWaitingMs || 0,
      { queue: queueName }
    );
  });

  pushMetric(lines, "dokanx_outbox_pending", "Pending outbox events", "gauge", metrics.outbox?.pending || 0);
  pushMetric(lines, "dokanx_outbox_in_flight", "In-flight outbox events", "gauge", metrics.outbox?.inFlight || 0);
  pushMetric(lines, "dokanx_outbox_errored", "Errored outbox events", "gauge", metrics.outbox?.errored || 0);
  pushMetric(
    lines,
    "dokanx_outbox_oldest_pending_lag_ms",
    "Age in milliseconds of the oldest pending outbox event",
    "gauge",
    metrics.outbox?.oldestPendingLagMs || 0
  );

  return `${lines.join("\n")}\n`;
}

exports.metrics = async (req, res) => {
  const [shops, orders, queueStatus, outboxStats] = await Promise.all([
    createReadCountQuery(Shop),
    createReadCountQuery(Order),
    getQueueStatus().catch(() => ({})),
    Promise.all([
      createReadCountQuery(Outbox, { processed: false }),
      createReadQuery(Outbox, { processed: false }).sort({ createdAt: 1 }).limit(1).lean(),
      createReadCountQuery(Outbox, { processed: false, processingAt: { $ne: null } }),
      createReadCountQuery(Outbox, { processed: false, lastError: { $ne: null } }),
    ]),
  ]);

  const [pendingOutbox, oldestPendingRows, inFlightOutbox, erroredOutbox] = outboxStats;
  const oldestPending = Array.isArray(oldestPendingRows) ? oldestPendingRows[0] || null : null;

  const payload = {
    shops,
    orders,
    queues: queueStatus,
    outbox: {
      pending: pendingOutbox,
      inFlight: inFlightOutbox,
      errored: erroredOutbox,
      oldestPendingAt: oldestPending?.createdAt || null,
      oldestPendingLagMs: oldestPending?.createdAt ? Date.now() - new Date(oldestPending.createdAt).getTime() : 0,
    },
  };

  if (String(req.query?.format || "").toLowerCase() === "prometheus") {
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return res.send(buildPrometheusPayload(payload));
  }

  return res.json(payload);
};
