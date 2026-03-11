jest.mock("../modules/billing/billing.service", () => ({
  previewCommission: jest.fn(),
  previewPaymentRouting: jest.fn(),
}));

const billing = require("../modules/billing/billing.service");
const execution = require("../modules/billing/billingExecution.service");

describe("billingExecution.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should resolve billing snapshot", async () => {
    billing.previewCommission.mockResolvedValue({
      rate: 5,
      commissionAmount: 50,
      source: "RULE",
    });
    billing.previewPaymentRouting.mockResolvedValue({
      destination: "PLATFORM_WALLET",
      gatewayKey: "",
      source: "DEFAULT",
    });

    const row = await execution.resolveBillingSnapshot({
      tenantId: "shop-1",
      orderChannel: "ONLINE",
      paymentMethod: "BKASH",
      amount: 1000,
    });

    expect(row.commission.amount).toBe(50);
    expect(row.routing.destination).toBe("PLATFORM_WALLET");
  });

  it("should build settlement breakdown", async () => {
    billing.previewCommission.mockResolvedValue({
      rate: 2,
      commissionAmount: 20,
      source: "PLAN",
    });
    billing.previewPaymentRouting.mockResolvedValue({
      destination: "MERCHANT_DIRECT",
      gatewayKey: "BKASH",
      source: "RULE",
    });

    const row = await execution.buildSettlementBreakdown({
      tenantId: "shop-1",
      grossAmount: 1000,
    });

    expect(row.netAmount).toBe(980);
    expect(row.routingDestination).toBe("MERCHANT_DIRECT");
  });
});
