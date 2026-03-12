const { getProviderConfig, isConfigured } = require("../modules/courier/providerConfig.service");
const { getProvider, listProviders } = require("../modules/courier/courierProviderRegistry");

describe("courier provider config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should resolve provider env config", () => {
    process.env.PATHAO_BASE_URL = "https://sandbox.pathao.test";
    process.env.PATHAO_API_KEY = "key-1";
    const config = getProviderConfig("pathao");

    expect(config.baseUrl).toBe("https://sandbox.pathao.test");
    expect(isConfigured(config)).toBe(true);
  });

  it("should expose provider status", async () => {
    process.env.REDX_BASE_URL = "https://redx.test";
    process.env.REDX_API_KEY = "redx-key";
    const provider = getProvider("REDX");
    const result = await provider.createShipment({ orderId: "order-1", trackingCode: "TRK-1" });

    expect(provider.isConfigured()).toBe(true);
    expect(result.status).toBe("QUEUED");
    expect(result.request.url).toContain("https://redx.test");
    expect(listProviders().some(row => row.name === "REDX")).toBe(true);
  });
});
