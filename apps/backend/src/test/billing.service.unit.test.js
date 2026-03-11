jest.mock("../modules/billing/plan.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../modules/billing/subscription.model", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../modules/billing/commissionRule.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../modules/billing/paymentRoutingRule.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../modules/billing/smsPack.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
}));

const Plan = require("../modules/billing/plan.model");
const Subscription = require("../modules/billing/subscription.model");
const CommissionRule = require("../modules/billing/commissionRule.model");
const PaymentRoutingRule = require("../modules/billing/paymentRoutingRule.model");
const SmsPack = require("../modules/billing/smsPack.model");
const billing = require("../modules/billing/billing.service");

describe("billing.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create flexible plan", async () => {
    Plan.create.mockImplementation(async payload => payload);

    const row = await billing.createPlan({
      code: "starter",
      name: "Starter",
      monthlyFee: 999,
      commissionRate: 3,
      smsQuota: 500,
      features: { pos: true },
    });

    expect(row.code).toBe("STARTER");
    expect(row.monthlyFee).toBe(999);
    expect(row.commissionRate).toBe(3);
    expect(row.features.pos).toBe(true);
  });

  it("should resolve tenant plan with overrides", async () => {
    Subscription.findOne.mockReturnValue({
      populate: async () => ({
        _id: "sub-1",
        tenant: "shop-1",
        status: "ACTIVE",
        overrides: { commissionRate: 1, features: { whiteLabel: true } },
        plan: {
          _id: "plan-1",
          code: "BUSINESS",
          name: "Business",
          monthlyFee: 2499,
          commissionRate: 2,
          smsQuota: 2000,
          features: { reports: true },
          limits: {},
          metadata: {},
        },
      }),
    });

    const row = await billing.getTenantPlan("shop-1");
    expect(row.plan.commissionRate).toBe(1);
    expect(row.plan.features.reports).toBe(true);
    expect(row.plan.features.whiteLabel).toBe(true);
  });

  it("should preview commission from highest priority rule", async () => {
    Subscription.findOne.mockReturnValue({
      populate: async () => ({
        tenant: "shop-1",
        plan: { _id: "plan-1", commissionRate: 5 },
        overrides: {},
      }),
    });
    CommissionRule.find.mockReturnValue({
      sort: () => ({
        lean: async () => [{ _id: "rule-1", rate: 2, priority: 1, orderChannel: "ONLINE" }],
      }),
    });

    const result = await billing.previewCommission({
      tenantId: "shop-1",
      orderChannel: "ONLINE",
      orderAmount: 1000,
    });

    expect(result.rate).toBe(2);
    expect(result.commissionAmount).toBe(20);
    expect(result.source).toBe("RULE");
  });

  it("should fallback payment routing to platform wallet", async () => {
    Subscription.findOne.mockReturnValue({
      populate: async () => ({ tenant: "shop-1", plan: { _id: "plan-1" } }),
    });
    PaymentRoutingRule.find.mockReturnValue({
      sort: () => ({
        lean: async () => [],
      }),
    });

    const result = await billing.previewPaymentRouting({
      tenantId: "shop-1",
      orderChannel: "ONLINE",
      paymentMethod: "BKASH",
      hasOwnGateway: false,
    });

    expect(result.destination).toBe("PLATFORM_WALLET");
    expect(result.source).toBe("DEFAULT");
  });

  it("should create sms pack", async () => {
    SmsPack.create.mockImplementation(async payload => payload);

    const row = await billing.createSmsPack({
      code: "pack500",
      name: "Pack 500",
      credits: 500,
      price: 300,
    });

    expect(row.code).toBe("PACK500");
    expect(row.credits).toBe(500);
  });
});
