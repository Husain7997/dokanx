// src/services/settlement.service.js

const { runOnce } =
  require("@/core/infrastructure");
const {
  executeFinancial
} = require("@/services/financialCommand.service");
const Settlement = require("@/models/settlement.model");
const { buildSettlementBreakdown } = require("@/modules/billing/billingExecution.service");
const { recordPlatformCommission } = require("@/modules/billing/platformBilling.service");

async function processSettlement({
  shopId,
  grossAmount,
  fee,
  idempotencyKey,
}) {

  return runOnce(
    `settlement:${idempotencyKey}`,
    async () => {
      const breakdown = await buildSettlementBreakdown({
        tenantId: shopId,
        grossAmount,
        orderChannel: "ONLINE",
        paymentMethod: "UNKNOWN",
        hasOwnGateway: false,
      });

      const settlement = await Settlement.create({
        shopId,
        idempotencyKey,
        totalAmount: breakdown.grossAmount,
        commission: breakdown.commissionAmount,
        netAmount: breakdown.netAmount,
        netPayout: breakdown.routingDestination === "MERCHANT_DIRECT" ? 0 : breakdown.netAmount,
        orderCount: 1,
        taxAmount: toNumber(fee, 0),
        status: breakdown.routingDestination === "MERCHANT_DIRECT" ? "COMPLETED" : "PENDING",
        payoutRef: breakdown.routingDestination === "MERCHANT_DIRECT" ? "MERCHANT_DIRECT" : "",
        settlementRuleSnapshot: {
          routingDestination: breakdown.routingDestination,
          commissionRate: breakdown.billingSnapshot.commission.rate,
          source: breakdown.billingSnapshot.commission.source,
        },
      });

      const financial =
        breakdown.routingDestination === "MERCHANT_DIRECT"
          ? { skipped: true, reason: "MERCHANT_DIRECT" }
          : await executeFinancial({
              shopId,
              amount: breakdown.netAmount,
              idempotencyKey,
              reason: "wallet_credit"
            });

      const platformCommission = await recordPlatformCommission({
        commissionAmount: breakdown.commissionAmount,
        orderId: null,
        attemptId: null,
        sourceTenantId: shopId,
        idempotencyKey: `${idempotencyKey}:platform_commission`,
      });

      return {
        settlement,
        financial,
        platformCommission,
      };

    }
  );
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  processSettlement,
};


