class BaseAdsConnector {
  constructor(platform) {
    this.platform = platform;
  }

  validateCampaignPayload(campaign = {}) {
    if (!campaign || typeof campaign !== "object") {
      const err = new Error("Invalid campaign payload");
      err.statusCode = 400;
      throw err;
    }
  }

  async publishCampaign(campaign = {}) {
    this.validateCampaignPayload(campaign);
    return {
      platform: this.platform,
      externalCampaignId: "",
      syncStatus: "NOT_IMPLEMENTED",
      syncedAt: new Date().toISOString(),
    };
  }
}

module.exports = BaseAdsConnector;
