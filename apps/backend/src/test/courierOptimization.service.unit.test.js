jest.mock("../modules/courier/models/courierOptimizationProfile.model", () => ({
  findOneAndUpdate: jest.fn(async (_query, update) => ({ _id: "profile-1", ...update.$set })),
  findOne: jest.fn(async () => null),
}));

const service = require("../modules/courier/courierOptimization.service");

describe("courier optimization service", () => {
  it("scores providers and recommends the best option", async () => {
    const result = await service.recommendProvider({
      shopId: "shop-1",
      providers: [
        { name: "PATHAO", reliabilityScore: 92, codSuccessRate: 90, cost: 80, etaHours: 12 },
        { name: "REDX", reliabilityScore: 85, codSuccessRate: 80, cost: 60, etaHours: 24 },
      ],
    });

    expect(result.recommendation).toBeTruthy();
    expect(result.rankedProviders[0].optimizationScore).toBeGreaterThan(0);
  });
});
