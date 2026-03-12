jest.mock("../intelligence/intelligenceTelemetry.service", () => ({
  recordIntelligenceMetric: jest.fn(async payload => payload),
}));

const ranking = require("../intelligence/rankingEngine.service");
const search = require("../intelligence/searchEngine.service");

describe("advanced discovery engine", () => {
  it("ranks high relevance and close products first", () => {
    const rows = ranking.rankDiscoveryResults([
      {
        name: "Fresh Milk",
        relevance: 0.95,
        distanceKm: 1,
        ratingAverage: 4.8,
        price: 80,
        stock: 40,
        trustScore: 90,
      },
      {
        name: "Fresh Milk",
        relevance: 0.8,
        distanceKm: 5,
        ratingAverage: 4.2,
        price: 75,
        stock: 20,
        trustScore: 70,
      },
    ]);

    expect(rows[0].aiScore).toBeGreaterThan(rows[1].aiScore);
  });

  it("returns search latency below target on in-memory ranking", async () => {
    const result = await search.searchCatalog({
      shopId: "shop-1",
      query: "milk",
      origin: { lat: 23.81, lng: 90.41 },
      products: [
        {
          _id: "prod-1",
          name: "Fresh Milk",
          brand: "Farm",
          category: "Dairy",
          price: 80,
          stock: 20,
          trustScore: 85,
          ratingAverage: 4.7,
          location: { lat: 23.82, lng: 90.42 },
        },
      ],
    });

    expect(result.results).toHaveLength(1);
    expect(result.latencyMs).toBeLessThan(200);
  });
});
