const { getAdsConnector } = require("../modules/ads/connectors");

describe("Ads Connectors Registry", () => {
  it("should resolve supported connectors", () => {
    expect(getAdsConnector("facebook").platform).toBe("facebook");
    expect(getAdsConnector("google").platform).toBe("google");
    expect(getAdsConnector("youtube").platform).toBe("youtube");
  });

  it("should reject unsupported connector", () => {
    expect(() => getAdsConnector("tiktok")).toThrow(/Unsupported ads platform/);
  });
});
