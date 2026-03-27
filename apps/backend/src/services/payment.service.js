const PaymentAttempt = require("../models/paymentAttempt.model");
const Order = require("../models/order.model");
const { FinancialEngine, FinancialTypes } = require("@/core/financial");
const mongoose = require("mongoose");
const { runOnce } = require("@/core/infrastructure");
const { publishEvent } = require("@/infrastructure/events/event.dispatcher");
const logger = require("@/core/infrastructure/logger");
const AccountingEntry = require("../modules/wallet-engine/accountingEntry.model");
const fraudService = require("./fraud.service");
const { resolveShopId } = require("../utils/order-normalization.util");
const commissionService = require("../modules/commission-engine/commission.service");
const agentService = require("../modules/agent/agent.service");
const walletService = require("./wallet.service");
const { assertShopFinancialInvariant } = require("./ledger-reconciliation.service");
const creditService = require("../modules/credit-engine/credit.service");

function extractCreditRepaymentReference(payload = {}) {
  return String(
    payload.referenceId ||
    payload.repaymentReferenceId ||
    payload.meta?.referenceId ||
    payload.metadata?.referenceId ||
    ""
  ).trim() || null;
}

async function handlePaymentWebhook(payload) {
  const { providerPaymentId, status } = payload;
  const repaymentReferenceId = extractCreditRepaymentReference(payload);

  const attempt = await PaymentAttempt.findOne({ providerPaymentId });

  if (!attempt) {
    if (status === "SUCCESS") {
      const repaymentResult = await creditService.confirmOnlineRepaymentByReference({
        payload,
        providerPaymentId: providerPaymentId || null,
        provider: payload.provider || null,
        webhookEventId: payload.eventId || payload.webhookEventId || null,
      });

      if (repaymentResult?.matched || repaymentResult?.duplicate) {
        return repaymentResult;
      }
    } else {
      const repaymentFailure = await creditService.failOnlineRepaymentByReference({
        payload,
        providerPaymentId: providerPaymentId || null,
        provider: payload.provider || null,
        webhookEventId: payload.eventId || payload.webhookEventId || null,
      });

      if (repaymentFailure?.matched || repaymentFailure?.duplicate) {
        return repaymentFailure;
      }
    }

    throw new Error("Attempt not found");
  }

  if (attempt.status === "SUCCESS" && attempt.processed) {
    logger.info({
      event: "PAYMENT_WEBHOOK_DUPLICATE",
      paymentAttemptId: String(attempt._id),
      providerPaymentId,
      status,
    }, "Duplicate payment webhook ignored");
    return { duplicate: true };
  }

  if (status !== "SUCCESS") {
    attempt.status = status;
    await attempt.save();
    await Order.updateOne(
      { _id: attempt.order, paymentStatus: { $ne: "SUCCESS" } },
      { $set: { paymentStatus: "FAILED", status: "PAYMENT_FAILED" } }
    );
    logger.warn({
      event: "PAYMENT_MARKED_FAILED",
      paymentAttemptId: String(attempt._id),
      providerPaymentId,
      orderId: String(attempt.order),
      status,
    }, "Payment attempt marked failed");
    try {
      await fraudService.evaluateTransaction({
        orderId: attempt.order,
        paymentAttemptId: attempt._id,
        source: "payment_failed",
        context: {},
      });
    } catch (fraudError) {
      console.warn("Fraud evaluation failed", fraudError?.message || fraudError);
    }
    return { ok: false };
  }

  const order = await Order.findById(attempt.order);
  const shopId = resolveShopId(order);

  const paymentResult = await runOnce(
    `payment:${attempt._id}`,
    async () => {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        const freshOrder = await Order.findById(order._id).session(session);
        const freshAttempt = await PaymentAttempt.findById(attempt._id).session(session);

        if (freshAttempt.status === "SUCCESS" && freshAttempt.processed) {
          return { duplicate: true };
        }

        logger.info({
          event: "PAYMENT_WEBHOOK_PROCESSING",
          paymentAttemptId: String(freshAttempt._id),
          providerPaymentId,
          orderId: freshOrder?._id ? String(freshOrder._id) : null,
          shopId: shopId ? String(shopId) : null,
          amount: Number(freshAttempt.amount || 0),
          paymentMode: freshOrder?.paymentMode || null,
        }, "Processing successful payment webhook");

        freshAttempt.status = status;

        if (!freshOrder.commissionSnapshot?.appliedAt) {
          await commissionService.applyCommission(freshOrder, { session });
        }

        await walletService.addTransaction({
          shopId,
          customerId: freshOrder.customerId || null,
          type: "income",
          walletType: freshOrder.paymentMode === "CREDIT" ? "CREDIT" : "CASH",
          amount: freshAttempt.amount,
          referenceId: String(freshOrder._id),
          metadata: {
            paymentAttempt: freshAttempt._id,
            commissionSnapshot: freshOrder.commissionSnapshot || null,
            trafficType: freshOrder.trafficType || "marketplace",
          },
          session,
        });

        freshOrder.paymentStatus = "SUCCESS";
        if (freshOrder.status === "PAYMENT_PENDING" || freshOrder.status === "PLACED") {
          freshOrder.status = "CONFIRMED";
        }
        freshAttempt.processed = true;
        freshAttempt.processedAt = new Date();

        await freshOrder.save({ session });
        await freshAttempt.save({ session });
        await assertSuccessfulPaymentInvariant({
          orderId: freshOrder._id,
          paymentAttemptId: freshAttempt._id,
          shopId,
          amount: freshAttempt.amount,
          paymentMode: freshOrder.paymentMode,
          session,
        });
        await session.commitTransaction();
        return { ok: true };
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    }
  );

  if (paymentResult?.duplicate) {
    return paymentResult;
  }

  await publishEvent("payment.received", {
    orderId: order._id,
    shopId,
    userId: order.customerId || order.customer || order.user || null,
    amount: attempt.amount,
    paymentAttemptId: attempt._id,
  });

  try {
    await agentService.handleSuccessfulShopPayment({
      shopId,
      amount: attempt.amount,
      orderId: order._id,
    });
  } catch (agentError) {
    console.warn("Agent payment hook failed", agentError?.message || agentError);
  }

  try {
    await fraudService.evaluateTransaction({
      orderId: order._id,
      paymentAttemptId: attempt._id,
      source: "payment_received",
      context: {},
    });
  } catch (fraudError) {
    console.warn("Fraud evaluation failed", fraudError?.message || fraudError);
  }

  return { ok: true };
}

async function assertSuccessfulPaymentInvariant({
  orderId,
  paymentAttemptId,
  shopId,
  amount,
  paymentMode,
  session,
}) {
  const [freshOrder, freshAttempt, accountingEntry] = await Promise.all([
    Order.findById(orderId).session(session || null).lean(),
    PaymentAttempt.findById(paymentAttemptId).session(session || null).lean(),
    AccountingEntry.findOne({
      shopId,
      referenceId: String(orderId),
      transactionType: "income",
      walletType: paymentMode === "CREDIT" ? "CREDIT" : "CASH",
    }).session(session || null).lean(),
  ]);

  if (!freshOrder || freshOrder.paymentStatus !== "SUCCESS" || !["CONFIRMED", "SHIPPED", "DELIVERED"].includes(String(freshOrder.status || ""))) {
    const error = new Error("ORDER_PAYMENT_STATE_MISMATCH");
    error.statusCode = 409;
    error.code = "ORDER_PAYMENT_STATE_MISMATCH";
    error.retryable = false;
    throw error;
  }

  if (!freshAttempt || !freshAttempt.processed || freshAttempt.status !== "SUCCESS") {
    const error = new Error("PAYMENT_ATTEMPT_STATE_MISMATCH");
    error.statusCode = 409;
    error.code = "PAYMENT_ATTEMPT_STATE_MISMATCH";
    error.retryable = false;
    throw error;
  }

  if (!accountingEntry || Number(accountingEntry.amount || 0) !== Number(amount || 0)) {
    const error = new Error("PAYMENT_LEDGER_MISMATCH");
    error.statusCode = 409;
    error.code = "PAYMENT_LEDGER_MISMATCH";
    error.retryable = false;
    throw error;
  }

  await assertShopFinancialInvariant({ shopId, session, referenceId: String(orderId) });
}

module.exports = {
  handlePaymentWebhook
};
