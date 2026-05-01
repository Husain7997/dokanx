const { queues, runOnce } = require("@/core/infrastructure");

const settlementService = require("../services/settlement.service");
const payoutService = require("../services/payout.service");
const Order = require("../models/order.model");
const { createAudit } = require("../utils/audit.util");
const commissionService = require("../modules/commission-engine/commission.service");
const deliveryService = require("../modules/delivery-engine/delivery.service");
const creditService = require("../modules/credit-engine/credit.service");
const fraudService = require("../services/fraud.service");
const { logSearchEvent } = require("../services/search.service");
const agentService = require("../modules/agent/agent.service");

queues.payments.process("settlement", 5, async (job) => {
  const { shopId, grossAmount, fee } = job.data;
  if (!shopId || !Number.isFinite(Number(grossAmount))) {
    return {
      skipped: true,
      reason: "missing_settlement_inputs",
      data: job.data || null,
    };
  }

  return runOnce(`settlement-${shopId}-${job.id}`, async () =>
    settlementService.processSettlement({
      shopId,
      grossAmount,
      fee,
      idempotencyKey: job.id,
    })
  );
});

queues.payments.process("payout", 2, async (job) =>
  runOnce(`payout-${job.id}`, async () => payoutService.processPayout(job.data))
);

queues.payments.process("order-post-create", 3, async (job) =>
  runOnce(`order-post-create:${job.data.orderId}`, async () => {
    const order = await Order.findById(job.data.orderId);
    if (!order) {
      return { skipped: true, reason: "order_missing" };
    }

    await commissionService.applyCommission(order);
    await deliveryService.groupOrdersByCustomerAndLocation({ order });

    if (job.data.paymentMode === "CREDIT") {
      await creditService.createCreditSale({
        orderId: order._id,
        customerId: order.customerId,
        shopId: order.shopId,
        amount: order.totalAmount,
      }, { _id: job.data.actorUserId || null });
    }

    try {
      await fraudService.evaluateTransaction({
        orderId: order._id,
        source: "order_created",
        context: job.data.requestMeta || {},
      });
    } catch (fraudError) {
      console.warn("Fraud evaluation failed", fraudError?.message || fraudError);
    }

    if (job.data.searchId) {
      await logSearchEvent({
        searchId: job.data.searchId,
        query: job.data.searchQuery || "",
        eventType: "CHECKOUT",
        userId: job.data.actorUserId || null,
        shopId: order.shopId || job.data.requestMeta?.shopId || null,
        metadata: {
          items: Number(job.data.requestMeta?.itemCount || 0),
          totalAmount: Number(job.data.requestMeta?.totalAmount || 0),
        },
      });
    }

    await createAudit({
      action: "ORDER_POST_PROCESSING_COMPLETED",
      performedBy: job.data.actorUserId || null,
      targetType: "Order",
      targetId: order._id,
      req: {
        ip: job.data.requestMeta?.ip || "SYSTEM",
        headers: { "user-agent": job.data.requestMeta?.userAgent || "SYSTEM" },
      },
      meta: {
        paymentMode: job.data.paymentMode || order.paymentMode || null,
      },
    });

    return { ok: true, orderId: order._id };
  })
);

queues.payments.process("payment-post-success", 3, async (job) =>
  runOnce(`payment-post-success:${job.data.paymentAttemptId}`, async () => {
    try {
      await agentService.handleSuccessfulShopPayment({
        shopId: job.data.shopId,
        amount: job.data.amount,
        orderId: job.data.orderId,
      });
    } catch (agentError) {
      console.warn("Agent payment hook failed", agentError?.message || agentError);
    }

    try {
      await fraudService.evaluateTransaction({
        orderId: job.data.orderId,
        paymentAttemptId: job.data.paymentAttemptId,
        source: "payment_received",
        context: {},
      });
    } catch (fraudError) {
      console.warn("Fraud evaluation failed", fraudError?.message || fraudError);
    }

    return { ok: true, paymentAttemptId: job.data.paymentAttemptId };
  })
);

module.exports = {
  worker: "payments",
};
