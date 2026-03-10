const insightsService = require("../modules/ai-insights/aiInsights.service");

describe("AI Insights Helpers", () => {
  it("should calculate stockout days from velocity", () => {
    const days = insightsService._internals.computeStockoutDays({
      stock: 100,
      soldQty: 50,
      days: 10,
    });
    expect(days).toBe(20);
  });

  it("should return null stockout days when no velocity", () => {
    const days = insightsService._internals.computeStockoutDays({
      stock: 100,
      soldQty: 0,
      days: 10,
    });
    expect(days).toBeNull();
  });
});
