const billing = require("./billing.service");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function resolveBillingSnapshot({
  tenantId,
  orderChannel = "ONLINE",
  paymentMethod = "UNKNOWN",
  amount = 0,
  hasOwnGateway = false,
}) {
  const [commission, routing] = await Promise.all([
    billing.previewCommission({
      tenantId,
      orderChannel,
      orderAmount: amount,
    }),
    billing.previewPaymentRouting({
      tenantId,
      orderChannel,
      paymentMethod,
      hasOwnGateway,
    }),
  ]);

  return {
    orderChannel,
    paymentMethod,
    routing: {
      destination: routing.destination,
      gatewayKey: routing.gatewayKey,
      source: routing.source,
    },
    commission: {
      rate: toNumber(commission.rate, 0),
      amount: toNumber(commission.commissionAmount, 0),
      source: commission.source,
    },
  };
}

async function buildSettlementBreakdown({
  tenantId,
  grossAmount,
  orderChannel = "ONLINE",
  paymentMethod = "UNKNOWN",
  hasOwnGateway = false,
}) {
  const snapshot = await resolveBillingSnapshot({
    tenantId,
    orderChannel,
    paymentMethod,
    amount: grossAmount,
    hasOwnGateway,
  });

  const gross = toNumber(grossAmount, 0);
  const commissionAmount = toNumber(snapshot.commission.amount, 0);

  return {
    grossAmount: gross,
    commissionAmount,
    netAmount: Math.max(0, gross - commissionAmount),
    routingDestination: snapshot.routing.destination,
    billingSnapshot: snapshot,
  };
}

module.exports = {
  resolveBillingSnapshot,
  buildSettlementBreakdown,
};
