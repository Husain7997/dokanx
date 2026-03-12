jest.mock("../modules/gift-card/models/giftCard.model", () => ({
  create: jest.fn(async payload => payload),
  find: jest.fn(() => ({
    sort: jest.fn(async () => [{ code: "GC1" }]),
  })),
  findOne: jest.fn(),
}));

const GiftCard = require("../modules/gift-card/models/giftCard.model");
const service = require("../modules/gift-card/giftCard.service");

describe("gift card service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a gift card with initial balance", async () => {
    const row = await service.createGiftCard({
      shopId: "shop-1",
      payload: { code: "gc1", balance: 500 },
    });
    expect(row.remainingBalance).toBe(500);
    expect(row.code).toBe("GC1");
  });

  it("redeems active balance safely", async () => {
    const save = jest.fn();
    GiftCard.findOne.mockResolvedValue({
      shopId: "shop-1",
      code: "GC1",
      status: "ACTIVE",
      remainingBalance: 200,
      expiresAt: null,
      save,
    });

    const row = await service.redeemGiftCard({
      shopId: "shop-1",
      code: "gc1",
      amount: 50,
    });

    expect(row.remainingBalance).toBe(150);
    expect(save).toHaveBeenCalled();
  });
});
