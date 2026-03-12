const service = require("../modules/discovery/discovery.service");

describe("discovery ranking", () => {
  it("should reward higher trust in shop score", () => {
    const lowTrust = service._internals.buildShopScore({
      distanceKm: 1,
      ratingAverage: 4.5,
      trustScore: 20,
      inStockCount: 5,
    });

    const highTrust = service._internals.buildShopScore({
      distanceKm: 1,
      ratingAverage: 4.5,
      trustScore: 90,
      inStockCount: 5,
    });

    expect(highTrust).toBeGreaterThan(lowTrust);
  });
});
