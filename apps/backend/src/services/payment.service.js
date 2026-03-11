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

  const attempt =
    await PaymentAttempt.findOne({
      providerPaymentId
    });

  if (!attempt)
    throw new Error("Attempt not found");

  if (attempt.status === "SUCCESS")
    return { duplicate: true };

  attempt.status = status;
  await attempt.save();

  if (status !== "SUCCESS")
    return { ok: false };

  const order =
    await Order.findById(attempt.order);

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
