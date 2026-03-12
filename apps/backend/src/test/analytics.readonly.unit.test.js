const analytics = require("../analytics");

describe("analytics read-only layer", () => {
  it("builds daily sales aggregates", async () => {
    const rows = await analytics.buildDailySalesAggregate({
      rows: [
        { dateKey: "2026-03-10", orderCount: 2, grossSales: 100, itemCount: 4 },
        { dateKey: "2026-03-10", orderCount: 1, grossSales: 50, itemCount: 1 },
      ],
    });

    expect(rows[0].grossSales).toBe(150);
    expect(rows[0].orderCount).toBe(3);
  });

  it("builds merchant cohorts and regional demand", () => {
    const cohorts = analytics.buildMerchantCohorts({
      merchants: [
        { createdAt: "2026-03-01T00:00:00.000Z", isActive: true },
        { createdAt: "2026-03-12T00:00:00.000Z", status: "SUSPENDED" },
      ],
    });
    const demand = analytics.buildRegionalDemand({
      rows: [
        { region: "Dhaka", demandUnits: 20, revenue: 1000, searchVolume: 30 },
      ],
    });

    expect(cohorts[0].merchantCount).toBe(2);
    expect(demand[0].region).toBe("Dhaka");
  });
});
