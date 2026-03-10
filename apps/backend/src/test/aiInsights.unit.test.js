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

  it("should recommend price increase on high demand and low stock", () => {
    const rec = insightsService._internals.buildPricingRecommendation({
      name: "Napa",
      currentPrice: 10,
      soldQty: 70,
      stock: 10,
      days: 7,
      maxAdjustmentPct: 15,
    });

    expect(rec.adjustmentPct).toBeGreaterThan(0);
    expect(rec.suggestedPrice).toBeGreaterThan(10);
  });

  it("should recommend price decrease on low demand and high stock", () => {
    const rec = insightsService._internals.buildPricingRecommendation({
      name: "Soap",
      currentPrice: 50,
      soldQty: 2,
      stock: 120,
      days: 14,
      maxAdjustmentPct: 15,
    });

    expect(rec.adjustmentPct).toBeLessThan(0);
    expect(rec.suggestedPrice).toBeLessThan(50);
  });

  it("should compute positive reorder quantity when stock cover is below reorder point", () => {
    const gap = insightsService._internals.computeDemandGap({
      stock: 8,
      dailyDemand: 3,
      leadTimeDays: 4,
      bufferDays: 3,
    });

    expect(gap.stockCoverDays).toBeLessThanOrEqual(gap.reorderPointDays);
    expect(gap.reorderQty).toBeGreaterThan(0);
  });

  it("should prioritize supplier score with higher reliability and lower lead-time", () => {
    const high = insightsService._internals.scoreSupplierForReorder({
      leadTimeDays: 2,
      wholesalePrice: 120,
      availableQty: 100,
      reliabilityScore: 90,
    });
    const low = insightsService._internals.scoreSupplierForReorder({
      leadTimeDays: 6,
      wholesalePrice: 120,
      availableQty: 100,
      reliabilityScore: 55,
    });

    expect(high).toBeGreaterThan(low);
  });

  it("should keep suggested price above margin floor when cost signal exists", () => {
    const advisory = insightsService._internals.buildMarginAwareRecommendation({
      productName: "Paracetamol",
      currentPrice: 12,
      estimatedCost: 10,
      targetMarginPct: 20,
      competitorAvgPrice: 13,
      demandTrendPct: 5,
      maxAdjustmentPct: 15,
    });

    expect(advisory.suggestedPrice).toBeGreaterThanOrEqual(12);
    expect(advisory.confidence).toMatch(/MEDIUM|HIGH/);
  });

  it("should raise fraud score when payout and credit risk signals are elevated", () => {
    const high = insightsService._internals.buildFraudScore({
      payoutFailureRate: 40,
      payoutAmountSpikePct: 80,
      highRiskCreditRatio: 50,
      overdueExposure: 60,
    });
    const low = insightsService._internals.buildFraudScore({
      payoutFailureRate: 2,
      payoutAmountSpikePct: 0,
      highRiskCreditRatio: 5,
      overdueExposure: 5,
    });

    expect(high).toBeGreaterThan(low);
    expect(insightsService._internals.toSeverity(high)).toMatch(/MEDIUM|HIGH/);
  });
});
