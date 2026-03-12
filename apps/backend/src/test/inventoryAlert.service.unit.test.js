jest.mock("../models/Inventory.model", () => ({
  aggregate: jest.fn(),
}));

jest.mock("../models/product.model", () => ({
  collection: {
    name: "products",
  },
}));

const Inventory = require("../models/Inventory.model");
const service = require("../services/inventoryAlert.service");

describe("inventoryAlert.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should build low stock alerts with default threshold and limit", async () => {
    Inventory.aggregate.mockResolvedValue([{ productName: "Napa", availableStock: 2 }]);

    const result = await service.listLowStockAlerts({
      shopId: "shop-1",
      filters: {},
    });

    expect(Inventory.aggregate).toHaveBeenCalledTimes(1);
    const pipeline = Inventory.aggregate.mock.calls[0][0];
    expect(pipeline[2].$match).toEqual({ availableStock: { $lte: 5 } });
    expect(pipeline[pipeline.length - 1].$limit).toBe(50);
    expect(result).toEqual([{ productName: "Napa", availableStock: 2 }]);
  });

  it("should cap alert limit and honor custom threshold", async () => {
    Inventory.aggregate.mockResolvedValue([]);

    await service.listLowStockAlerts({
      shopId: "shop-1",
      filters: { threshold: "3", limit: "500" },
    });

    const pipeline = Inventory.aggregate.mock.calls[0][0];
    expect(pipeline[2].$match).toEqual({ availableStock: { $lte: 3 } });
    expect(pipeline[pipeline.length - 1].$limit).toBe(200);
  });
});
