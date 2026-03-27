const AnalyticsSnapshot = require("../analytics/analyticsSnapshot.model");
const { getLatestSnapshot } = require("../analytics/analyticsWarehouse.service");

describe("analytics warehouse snapshot queries", () => {
  beforeEach(async () => {
    await AnalyticsSnapshot.deleteMany({});
  });

  it("returns the latest snapshot inside the requested date window", async () => {
    await AnalyticsSnapshot.create([
      {
        metricType: "DAILY_SALES",
        shopId: null,
        dateKey: new Date("2026-03-01T00:00:00.000Z"),
        payload: [{ date: "2026-03-01", gmv: 100 }],
      },
      {
        metricType: "DAILY_SALES",
        shopId: null,
        dateKey: new Date("2026-03-10T00:00:00.000Z"),
        payload: [{ date: "2026-03-10", gmv: 200 }],
      },
      {
        metricType: "DAILY_SALES",
        shopId: null,
        dateKey: new Date("2026-03-20T00:00:00.000Z"),
        payload: [{ date: "2026-03-20", gmv: 300 }],
      },
    ]);

    const snapshot = await getLatestSnapshot({
      shopId: null,
      metricType: "DAILY_SALES",
      dateFrom: "2026-03-05",
      dateTo: "2026-03-15",
    });

    expect(snapshot).toBeTruthy();
    expect(snapshot.dateKey.toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(snapshot.payload).toEqual([{ date: "2026-03-10", gmv: 200 }]);
  });

  it("returns null when no snapshot exists inside the requested date window", async () => {
    await AnalyticsSnapshot.create({
      metricType: "DAILY_SALES",
      shopId: null,
      dateKey: new Date("2026-03-01T00:00:00.000Z"),
      payload: [{ date: "2026-03-01", gmv: 100 }],
    });

    const snapshot = await getLatestSnapshot({
      shopId: null,
      metricType: "DAILY_SALES",
      dateFrom: "2026-03-05",
      dateTo: "2026-03-15",
    });

    expect(snapshot).toBeNull();
  });
});
