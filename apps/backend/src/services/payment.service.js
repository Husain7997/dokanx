const PaymentAttempt =
 require("../models/paymentAttempt.model");

const Order =
 require("../models/order.model");

const {
  runOnce
} = require("@/core/infrastructure");
const {
  executeFinancial
} = require("@/services/financialCommand.service");
const { buildSettlementBreakdown } = require("@/modules/billing/billingExecution.service");
const { recordPlatformCommission } = require("@/modules/billing/platformBilling.service");
const marketingService = require("@/modules/marketing/marketing.service");

async function handlePaymentWebhook(
  payload
) {

  const {
    providerPaymentId,
    status
  } = payload;

  const normalizedStatus = String(status || "").trim().toUpperCase();

  const attempt =
    await PaymentAttempt.findOne({
      providerPaymentId
    });

  if (!attempt)
    throw new Error("Attempt not found");

  if (attempt.status === "SUCCESS" && attempt.processed)
    return { duplicate: true };

  const order =
    await Order.findById(attempt.order);

  attempt.status = normalizedStatus || attempt.status;

  if (normalizedStatus !== "SUCCESS") {
    if (order) {
      order.paymentStatus = "FAILED";
      if (["PLACED", "PENDING", "PAYMENT_PENDING"].includes(String(order.status || ""))) {
        order.status = "PAYMENT_FAILED";
      }
      await order.save();
    }

    await attempt.save();
    return { ok: false };
  }

  if (order) {
    order.paymentStatus = "SUCCESS";
    order.isCompleted = true;
    if (["PLACED", "PENDING", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(String(order.status || ""))) {
      order.status = "CONFIRMED";
    }
    await order.save();
  }

  const breakdown = await buildSettlementBreakdown({
    tenantId: order.shopId || order.shop,
    grossAmount: attempt.amount,
    orderChannel: attempt?.billingSnapshot?.orderChannel || "ONLINE",
    paymentMethod: attempt?.billingSnapshot?.paymentMethod || "UNKNOWN",
    hasOwnGateway: attempt?.billingSnapshot?.routing?.destination === "MERCHANT_DIRECT",
  });

  attempt.billingSnapshot = {
    ...(attempt.billingSnapshot || {}),
    routing: {
      ...(attempt.billingSnapshot?.routing || {}),
      destination: breakdown.billingSnapshot.routing.destination,
      gatewayKey: breakdown.billingSnapshot.routing.gatewayKey,
      source: breakdown.billingSnapshot.routing.source,
    },
    commission: {
      rate: breakdown.billingSnapshot.commission.rate,
      amount: breakdown.billingSnapshot.commission.amount,
      source: breakdown.billingSnapshot.commission.source,
    },
  };
  attempt.processed = true;
  attempt.processedAt = new Date();
  await attempt.save();

  await runOnce(
    `payment:${attempt._id}`,
    async () => {
      const merchantDirect =
        breakdown.routingDestination === "MERCHANT_DIRECT";

      if (!merchantDirect) {
        await executeFinancial({
          shopId: order.shopId || order.shop,
          idempotencyKey: `ORDER_PAYMENT_${order._id}_${attempt._id}`,
          amount: breakdown.netAmount || attempt.amount,
          reason: "wallet_credit"
        });
      }

      await recordPlatformCommission({
        commissionAmount: breakdown.commissionAmount,
        orderId: order._id,
        attemptId: attempt._id,
        sourceTenantId: order.shopId || order.shop,
        idempotencyKey: `PLATFORM_COMMISSION_${order._id}_${attempt._id}`,
      });

      await marketingService.consumeCouponForOrder({
        shopId: order.shopId || order.shop,
        order,
      });

    }
  );

  return {
    ok: true,
    orderId: order?._id || null,
    billing: {
      routingDestination: breakdown.routingDestination,
      commissionAmount: breakdown.commissionAmount,
      netAmount: breakdown.netAmount,
      merchantCreditSkipped: breakdown.routingDestination === "MERCHANT_DIRECT",
    },
    coupon: {
      code: order?.appliedCoupon?.code || "",
      consumed: Boolean(order?.appliedCoupon?.code),
    },
  };
}

module.exports = {
  handlePaymentWebhook
};
