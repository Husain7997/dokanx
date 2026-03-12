const { getProvider } = require("../modules/courier/courierProviderRegistry");

describe("courierProviderRegistry", () => {
  it("should resolve known courier provider", () => {
    const provider = getProvider("pathao");
    expect(provider).toBeTruthy();
    expect(provider.name).toBe("PATHAO");
  });

  it("should return null for unknown provider", () => {
    const provider = getProvider("unknown");
    expect(provider).toBeNull();
  });
});
