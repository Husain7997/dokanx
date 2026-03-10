jest.mock("../modules/ads/models/adsCampaign.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../modules/ads/models/adsSyncTask.model", () => ({
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../modules/ads/connectors", () => ({
  getAdsConnector: jest.fn(),
}));

const AdCampaign = require("../modules/ads/models/adsCampaign.model");
const AdsSyncTask = require("../modules/ads/models/adsSyncTask.model");
const { getAdsConnector } = require("../modules/ads/connectors");
const adsService = require("../modules/ads/adsCampaign.service");

function buildCampaign(status = "QUEUED") {
  return {
    _id: "camp-1",
    status,
    platforms: {
      facebook: { enabled: true, syncStatus: "PENDING", lastError: "" },
      google: { enabled: false, syncStatus: "PENDING", lastError: "" },
      youtube: { enabled: false, syncStatus: "PENDING", lastError: "" },
    },
    statusHistory: [],
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function buildTask(status = "PENDING", attempts = 0, maxAttempts = 5) {
  return {
    _id: "task-1",
    campaignId: "camp-1",
    shopId: "shop-1",
    platform: "facebook",
    status,
    attempts,
    maxAttempts,
    lastError: "",
    lockedAt: null,
    save: jest.fn().mockResolvedValue(undefined),
  };
}

describe("Ads Sync Worker Batch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should sync task and activate campaign on success", async () => {
    const task = buildTask("PENDING", 0, 5);
    const campaign = buildCampaign("QUEUED");

    AdsSyncTask.find.mockReturnValueOnce({
      sort: () => ({
        limit: () => ({
          lean: async () => [task],
        }),
      }),
    });
    AdsSyncTask.findOneAndUpdate.mockResolvedValueOnce(task);

    AdCampaign.findById
      .mockResolvedValueOnce(campaign) // for processing
      .mockResolvedValueOnce(campaign); // for refresh

    AdsSyncTask.find.mockReturnValueOnce({
      lean: async () => [{ status: "SYNCED" }],
    }); // refresh

    getAdsConnector.mockReturnValue({
      publishCampaign: async () => ({ externalCampaignId: "ext-1" }),
    });

    const result = await adsService.runSyncTaskBatch({ limit: 10 });

    expect(result.processed).toBe(1);
    expect(result.synced).toBe(1);
    expect(campaign.platforms.facebook.syncStatus).toBe("SYNCED");
    expect(campaign.status).toBe("ACTIVE");
  });

  it("should schedule retry when sync fails and attempts remain", async () => {
    const task = buildTask("PENDING", 0, 5);
    const campaign = buildCampaign("QUEUED");

    AdsSyncTask.find.mockReturnValueOnce({
      sort: () => ({
        limit: () => ({
          lean: async () => [task],
        }),
      }),
    });
    AdsSyncTask.findOneAndUpdate.mockResolvedValueOnce(task);

    AdCampaign.findById
      .mockResolvedValueOnce(campaign)
      .mockResolvedValueOnce(campaign);

    AdsSyncTask.find.mockReturnValueOnce({
      lean: async () => [{ status: "PENDING" }],
    });

    getAdsConnector.mockReturnValue({
      publishCampaign: async () => {
        throw new Error("sync failed");
      },
    });

    const result = await adsService.runSyncTaskBatch({ limit: 10 });

    expect(result.processed).toBe(1);
    expect(result.retryScheduled).toBe(1);
    expect(task.status).toBe("PENDING");
    expect(campaign.platforms.facebook.syncStatus).toBe("PENDING");
  });
});
