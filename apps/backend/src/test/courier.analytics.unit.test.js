jest.mock("../modules/courier/models/courierShipment.model", () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
}));

const CourierShipment = require("../modules/courier/models/courierShipment.model");
const service = require("../modules/courier/courier.service");

describe("courier analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return courier dashboard", async () => {
    CourierShipment.aggregate
      .mockResolvedValueOnce([{ _id: "DELIVERED", count: 5 }])
      .mockResolvedValueOnce([{ _id: "PATHAO", shipmentCount: 5, deliveredCount: 4 }])
      .mockResolvedValueOnce([{ _id: "MATCHED", count: 4, totalExpected: 1000, totalCollected: 1000 }]);
    CourierShipment.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [{ trackingCode: "PAT-1" }],
        }),
      }),
    });

    const row = await service.getCourierDashboard({ shopId: "shop-1" });
    expect(row.statusBreakdown[0].count).toBe(5);
    expect(row.courierBreakdown[0]._id).toBe("PATHAO");
  });

  it("should list COD mismatches", async () => {
    CourierShipment.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [{ codReconciliationStatus: "MISMATCH" }],
        }),
      }),
    });

    const rows = await service.listCodMismatches({ shopId: "shop-1", limit: 10 });
    expect(rows).toHaveLength(1);
  });
});
