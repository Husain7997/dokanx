jest.mock("../modules/referral-affiliate/models/referral.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../modules/referral-affiliate/models/affiliateCommission.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

const Referral = require("../modules/referral-affiliate/models/referral.model");
const AffiliateCommission = require("../modules/referral-affiliate/models/affiliateCommission.model");
const service = require("../modules/referral-affiliate/referralAffiliate.service");

describe("referralAffiliate.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create referral with generated code", async () => {
    Referral.create.mockImplementation(async payload => payload);

    const row = await service.createReferral({
      shopId: "shop-1",
      referrerUserId: "user-1",
      payload: { refereePhone: "01700000000", rewardAmount: 100 },
    });

    expect(row.code).toMatch(/^REF_/);
    expect(row.rewardAmount).toBe(100);
  });

  it("should redeem referral", async () => {
    const save = jest.fn();
    Referral.findOne.mockResolvedValue({
      _id: "ref-1",
      status: "PENDING",
      save,
    });

    const row = await service.redeemReferral({
      shopId: "shop-1",
      userId: "user-2",
      code: "REF_TEST",
    });

    expect(row.status).toBe("REDEEMED");
    expect(save).toHaveBeenCalled();
  });

  it("should create affiliate commission", async () => {
    AffiliateCommission.create.mockImplementation(async payload => payload);

    const row = await service.createAffiliateCommission({
      shopId: "shop-1",
      payload: {
        affiliateUserId: "user-9",
        orderId: "order-1",
        orderAmount: 1000,
        commissionAmount: 75,
      },
    });

    expect(row.commissionAmount).toBe(75);
  });
});
