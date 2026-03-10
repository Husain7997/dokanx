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

  it("should build prioritized business actions from stock risk", () => {
    const actions = insightsService._internals.buildBusinessActions({
      periodDays: 7,
      topProducts: [
        { productId: "p1", name: "Napa", soldQty: 20, revenue: 1000, stock: 0 },
      ],
      stockRisk: [
        { productId: "p2", name: "Lux Soap", stock: 5, soldQty: 20, estimatedStockoutDays: 1.8 },
        { productId: "p3", name: "Rice", stock: 15, soldQty: 20, estimatedStockoutDays: 10 },
      ],
      maxActions: 5,
    });

    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].type).toBe("RESTOCK");
    expect(["CRITICAL", "HIGH", "MEDIUM"]).toContain(actions[0].riskLevel);
  });

  it("should compute percentage change with zero-safe behavior", () => {
    expect(insightsService._internals.pctChange(10, 5)).toBe(100);
    expect(insightsService._internals.pctChange(0, 0)).toBe(0);
    expect(insightsService._internals.pctChange(5, 0)).toBe(100);
  });
});
