const { executeFinancial, buildEntries } = require("@/services/financialCommand.service");

const PLATFORM_TENANT_ID = process.env.PLATFORM_WALLET_TENANT_ID || "000000000000000000000001";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function recordPlatformCommission({
  commissionAmount,
  orderId,
  attemptId = null,
  sourceTenantId,
  idempotencyKey,
}) {
  const amount = toNumber(commissionAmount, 0);
  if (amount <= 0) {
    return { skipped: true, amount: 0 };
  }

  return executeFinancial({
    shopId: PLATFORM_TENANT_ID,
    idempotencyKey,
    entries: buildEntries("platform_commission_credit", amount).map(entry => ({
      ...entry,
      meta: {
        ...(entry.meta || {}),
        orderId: orderId || null,
        attemptId: attemptId || null,
        sourceTenantId: sourceTenantId || null,
      },
    })),
  });
}

module.exports = {
  PLATFORM_TENANT_ID,
  recordPlatformCommission,
};
