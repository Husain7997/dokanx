jest.mock("../intelligence/intelligenceTelemetry.service", () => ({
  recordIntelligenceMetric: jest.fn(async payload => payload),
}));

const service = require("../intelligence/aiDemandForecast.service");

describe("AI demand forecasting", () => {
  it("predicts reorder need within a short horizon", async () => {
    const result = await service.forecastDemand({
      shopId: "shop-1",
      productId: "prod-1",
      dailySales: [4, 5, 5, 6, 6, 7, 7],
      currentStock: 18,
      leadTimeDays: 3,
    });

    expect(result.forecastDailyDemand).toBeGreaterThan(4);
    expect(result.reorderWithinDays).toBeLessThanOrEqual(2);
    expect(result.recommendedReorderQty).toBeGreaterThan(0);
  });
});
