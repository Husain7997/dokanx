jest.mock("../modules/marketing/models/coupon.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../modules/marketing/models/automationRule.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

const Coupon = require("../modules/marketing/models/coupon.model");
const AutomationRule = require("../modules/marketing/models/automationRule.model");
const service = require("../modules/marketing/marketing.service");

describe("marketing.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create uppercase coupon code", async () => {
    Coupon.create.mockImplementation(async payload => payload);

    const coupon = await service.createCoupon({
      shopId: "shop-1",
      actorId: "user-1",
      payload: {
        code: "save10",
        type: "percentage",
        value: 10,
      },
    });

    expect(coupon.code).toBe("SAVE10");
    expect(coupon.type).toBe("PERCENTAGE");
  });

  it("should evaluate free shipping coupon", async () => {
    Coupon.findOne.mockReturnValue({
      lean: async () => ({
        shopId: "shop-1",
        code: "SHIPFREE",
        type: "FREE_SHIPPING",
        minOrderAmount: 0,
        usageLimit: 0,
        usageCount: 0,
        isActive: true,
      }),
    });

    const result = await service.evaluateCoupon({
      shopId: "shop-1",
      code: "shipfree",
      cartSubtotal: 500,
      shippingFee: 80,
    });

    expect(result.valid).toBe(true);
    expect(result.effect.discountValue).toBe(80);
  });

  it("should build automation preview", async () => {
    AutomationRule.findOne.mockReturnValue({
      lean: async () => ({
        _id: "rule-1",
        shopId: "shop-1",
        trigger: "WELCOME",
        channel: "EMAIL",
        actionType: "COUPON",
        delayMinutes: 30,
        reward: { couponCode: "WELCOME10" },
        template: { subject: "Hello", body: "Welcome" },
      }),
    });

    const preview = await service.getAutomationPreview({
      shopId: "shop-1",
      ruleId: "rule-1",
    });

    expect(preview.executionWindow.humanized).toBe("30 minute(s) after trigger");
    expect(preview.reward.couponCode).toBe("WELCOME10");
  });
});
