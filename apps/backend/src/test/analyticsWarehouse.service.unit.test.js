jest.mock("../modules/analytics-warehouse/models/analyticsSnapshot.model", () => ({
  findOneAndUpdate: jest.fn(async (_query, update) => ({ payload: update.$set.payload })),
  find: jest.fn(() => ({
    sort: jest.fn(async () => [{ metricType: "DAILY_SALES" }]),
  })),
}));

const service = require("../modules/analytics-warehouse/analyticsWarehouse.service");

describe("analytics warehouse service", () => {
  it("builds snapshots for daily sales and trends", async () => {
    const rows = await service.buildWarehouseSnapshots({
      shopId: "shop-1",
      input: {
        dailySales: [{ dateKey: "2026-03-12", orderCount: 1, grossSales: 100, itemCount: 2 }],
        merchants: [{ createdAt: "2026-03-01T00:00:00.000Z", isActive: true }],
        regionalDemand: [{ region: "Dhaka", demandUnits: 10, revenue: 500, searchVolume: 20 }],
        currentTrends: [{ key: "orders", value: 10 }],
        previousTrends: [{ key: "orders", value: 5 }],
      },
    });

    expect(rows).toHaveLength(4);
  });
});
