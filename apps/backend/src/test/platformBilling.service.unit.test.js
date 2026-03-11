jest.mock("../services/financialCommand.service", () => ({
  buildEntries: jest.fn((reason, amount) => [
    { type: "debit", amount, meta: { reason } },
    { type: "credit", amount, meta: { reason } },
  ]),
  executeFinancial: jest.fn(async payload => payload),
}));

const financial = require("../services/financialCommand.service");
const service = require("../modules/billing/platformBilling.service");

describe("platformBilling.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should skip zero commission", async () => {
    const result = await service.recordPlatformCommission({
      commissionAmount: 0,
      orderId: "order-1",
      sourceTenantId: "shop-1",
      idempotencyKey: "idem-1",
    });

    expect(result.skipped).toBe(true);
    expect(financial.executeFinancial).not.toHaveBeenCalled();
  });

  it("should record platform commission to dedicated tenant", async () => {
    const result = await service.recordPlatformCommission({
      commissionAmount: 25,
      orderId: "order-1",
      attemptId: "attempt-1",
      sourceTenantId: "shop-1",
      idempotencyKey: "idem-2",
    });

    expect(result.shopId).toBe(service.PLATFORM_TENANT_ID);
    expect(result.idempotencyKey).toBe("idem-2");
    expect(result.entries[0].meta.sourceTenantId).toBe("shop-1");
  });
});
