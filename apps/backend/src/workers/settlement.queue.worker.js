const Order = require("@/models/order.model");
const { createWorker } = require("@/platform/queue/queue.client");
const { QUEUE_NAMES } = require("@/platform/queue/queues");
const { processSettlement } = require("@/services/settlement.service");

async function resolveSettlementJobPayload(job = {}) {
  const data = job.data || {};

  if (data.shopId && data.grossAmount) {
    return {
      shopId: data.shopId,
      grossAmount: Number(data.grossAmount),
      fee: Number(data.fee || 0),
      idempotencyKey: data.idempotencyKey || `settlement_job_${job.id}`,
    };
  }

  if (data.orderId) {
    const order = await Order.findById(data.orderId).lean();
    if (!order) {
      return null;
    }

    return {
      shopId: order.shopId || order.shop,
      grossAmount: Number(order.totalAmount || order.pricing?.grandTotal || 0),
      fee: 0,
      idempotencyKey: data.idempotencyKey || `settlement_order_${data.orderId}`,
    };
  }

  return null;
}

function startSettlementQueueWorker() {
  return createWorker(
    QUEUE_NAMES.SETTLEMENT,
    async (job) => {
      const payload = await resolveSettlementJobPayload(job);
      if (!payload || !payload.shopId || !payload.grossAmount) {
        return { skipped: true };
      }

      return processSettlement(payload);
    },
    { concurrency: 5 }
  );
}

module.exports = {
  _internals: {
    resolveSettlementJobPayload,
  },
  startSettlementQueueWorker,
};
