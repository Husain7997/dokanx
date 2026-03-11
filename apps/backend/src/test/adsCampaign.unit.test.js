jest.mock("../modules/ads/models/adsCampaign.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../modules/ads/models/adsSyncTask.model", () => ({
  find: jest.fn(),
}));

const AdCampaign = require("../modules/ads/models/adsCampaign.model");
const AdsSyncTask = require("../modules/ads/models/adsSyncTask.model");
const adsService = require("../modules/ads/adsCampaign.service");

describe("Ads Campaign Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AdCampaign.findOne.mockReset();
    AdCampaign.create.mockReset();
    AdCampaign.find.mockReset();
    AdsSyncTask.find.mockReset();
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

  it("should return sync status summary for enabled platforms", async () => {
    AdCampaign.findOne.mockReturnValueOnce({
      lean: async () => ({
        _id: "camp-1",
        shopId: "shop-1",
        status: "QUEUED",
        platforms: {
          facebook: { enabled: true, syncStatus: "PENDING", lastError: "" },
          google: { enabled: false, syncStatus: "NOT_SYNCED", lastError: "" },
          youtube: { enabled: true, syncStatus: "SYNCED", lastError: "" },
        },
      }),
    });
    AdsSyncTask.find.mockReturnValueOnce({
      sort: () => ({
        lean: async () => [
          { platform: "facebook", status: "PENDING", attempts: 1, maxAttempts: 5 },
          { platform: "youtube", status: "SYNCED", attempts: 1, maxAttempts: 5 },
        ],
      }),
    });

    const result = await adsService.getCampaignSyncStatus({
      shopId: "shop-1",
      campaignId: "camp-1",
    });

    expect(result.summary.totalEnabled).toBe(2);
    expect(result.summary.pending).toBe(1);
    expect(result.summary.synced).toBe(1);
    expect(result.summary.failed).toBe(0);
  });
});
