jest.mock("../modules/ads/models/adsCampaign.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

const AdCampaign = require("../modules/ads/models/adsCampaign.model");
const adsService = require("../modules/ads/adsCampaign.service");

describe("Ads Campaign Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should replay idempotent campaign create", async () => {
    AdCampaign.findOne.mockResolvedValueOnce({
      _id: "ad-1",
      shopId: "shop-1",
      name: "Test Campaign",
      objective: "SALES",
      status: "DRAFT",
      platforms: { facebook: { enabled: true } },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await adsService.createCampaign({
      shopId: "shop-1",
      userId: "user-1",
      payload: {
        name: "Test Campaign",
        platforms: { facebook: { enabled: true } },
      },
      idempotencyKey: "idem-ad-1",
    });

    expect(result.idempotencyReplay).toBe(true);
    expect(result.campaign._id).toBe("ad-1");
    expect(AdCampaign.create).not.toHaveBeenCalled();
  });

  it("should reject create when no platform is enabled", async () => {
    AdCampaign.findOne.mockResolvedValueOnce(null);

    await expect(
      adsService.createCampaign({
        shopId: "shop-1",
        userId: "user-1",
        payload: {
          name: "Invalid Campaign",
          platforms: {
            facebook: { enabled: false },
            google: { enabled: false },
            youtube: { enabled: false },
          },
        },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("should enforce invalid status transition", () => {
    expect(() =>
      adsService._internals.assertTransition("COMPLETED", "ACTIVE")
    ).toThrow(/Invalid campaign status transition/);
  });

  it("should create stable feed hash for same payload", () => {
    const input = [{ productId: "p1", title: "Soap" }];
    const a = adsService._internals.hashFeed(input);
    const b = adsService._internals.hashFeed(input);
    expect(a).toBe(b);
  });
});
