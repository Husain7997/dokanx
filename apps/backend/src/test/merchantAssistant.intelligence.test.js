jest.mock("../intelligence/intelligenceTelemetry.service", () => ({
  recordIntelligenceMetric: jest.fn(async payload => payload),
}));

const service = require("../intelligence/merchantAssistant.service");

describe("merchant AI assistant intelligence", () => {
  it("produces sales, pricing, and inventory advice", async () => {
    const result = await service.generateMerchantAssistantAdvice({
      shopId: "shop-1",
      sales: {
        currentWeek: 8200,
        previousWeek: 10000,
      },
      products: [
        {
          _id: "prod-1",
          name: "Milk Pack",
          price: 80,
          stock: 12,
          dailySales: [3, 4, 4, 5, 5, 5, 6],
          competitorPrices: [86, 88],
          leadTimeDays: 3,
        },
      ],
      searches: [{ term: "milk pack", count: 20 }],
    });

    expect(result.advice.length).toBeGreaterThan(0);
    expect(result.recommendationAccuracy).toBeGreaterThanOrEqual(0.8);
  });
});
