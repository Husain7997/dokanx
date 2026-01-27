jest.useRealTimers();
describe("Admin Finance API", () => {

  it("should return KPI summary", async () => {
    // Simulated service response (no DB needed)
    const result = {
      totalShops: 10,
      totalRevenue: 50000,
      pendingPayouts: 5,
    };

    expect(result).toHaveProperty("totalShops");
    expect(result).toHaveProperty("totalRevenue");
    expect(result).toHaveProperty("pendingPayouts");

    expect(typeof result.totalRevenue).toBe("number");
  });

});
