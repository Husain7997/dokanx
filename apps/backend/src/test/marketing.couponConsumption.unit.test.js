jest.mock("../modules/marketing/models/coupon.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../modules/marketing/models/couponRedemption.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../modules/marketing/models/automationRule.model", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../modules/marketing/models/automationExecution.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

const Coupon = require("../modules/marketing/models/coupon.model");
const CouponRedemption = require("../modules/marketing/models/couponRedemption.model");
const service = require("../modules/marketing/marketing.service");

describe("marketing coupon consumption", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should consume coupon once for paid order", async () => {
    const save = jest.fn().mockResolvedValue(true);
    Coupon.findOne.mockResolvedValue({
      _id: "coupon-1",
      code: "SAVE10",
      usageCount: 1,
      save,
    });
    CouponRedemption.findOne.mockReturnValue({
      lean: async () => null,
    });
    CouponRedemption.create.mockImplementation(async payload => payload);

    const result = await service.consumeCouponForOrder({
      shopId: "shop-1",
      order: {
        _id: "order-1",
        user: "user-1",
        appliedCoupon: {
          code: "SAVE10",
          discountValue: 100,
        },
      },
    });

    expect(result.consumed).toBe(true);
    expect(save).toHaveBeenCalled();
    expect(result.coupon.usageCount).toBe(2);
  });

  it("should not double-consume same order", async () => {
    Coupon.findOne.mockResolvedValue({
      _id: "coupon-1",
      code: "SAVE10",
      usageCount: 1,
      save: jest.fn(),
    });
    CouponRedemption.findOne.mockReturnValue({
      lean: async () => ({ _id: "redemption-1" }),
    });

    const result = await service.consumeCouponForOrder({
      shopId: "shop-1",
      order: {
        _id: "order-1",
        appliedCoupon: { code: "SAVE10" },
      },
    });

    expect(result.consumed).toBe(false);
    expect(result.reason).toBe("ALREADY_CONSUMED");
  });
});
