jest.mock("../warehouse/warehouse.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../modules/warehouse/models/warehouseStock.model", () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../modules/warehouse/models/stockTransfer.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

const Warehouse = require("../warehouse/warehouse.model");
const WarehouseStock = require("../modules/warehouse/models/warehouseStock.model");
const StockTransfer = require("../modules/warehouse/models/stockTransfer.model");
const service = require("../modules/warehouse/warehouse.service");

describe("warehouse.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create warehouse with uppercase code", async () => {
    Warehouse.create.mockImplementation(async payload => payload);

    const row = await service.createWarehouse({
      shopId: "shop-1",
      actorId: "user-1",
      payload: {
        code: "main",
        name: "Main Store",
        type: "main_store",
      },
    });

    expect(row.code).toBe("MAIN");
    expect(row.type).toBe("MAIN_STORE");
  });

  it("should reject transfer if source stock is insufficient", async () => {
    WarehouseStock.findOne.mockResolvedValue({
      available: 2,
    });

    await expect(
      service.createTransferRequest({
        shopId: "shop-1",
        actorId: "user-1",
        payload: {
          productId: "prod-1",
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          quantity: 5,
        },
      })
    ).rejects.toThrow("Insufficient stock in source warehouse");
  });

  it("should receive transfer and move stock", async () => {
    const sourceSave = jest.fn().mockResolvedValue(true);
    StockTransfer.findOne.mockResolvedValue({
      _id: "tr-1",
      shopId: "shop-1",
      productId: "prod-1",
      fromWarehouseId: "w1",
      toWarehouseId: "w2",
      quantity: 3,
      status: "SHIPPED",
      history: [],
      save: jest.fn().mockResolvedValue(true),
    });

    WarehouseStock.findOne.mockResolvedValueOnce({
      available: 10,
      save: sourceSave,
    });
    WarehouseStock.findOneAndUpdate.mockResolvedValue({ _id: "dest-stock" });

    const row = await service.updateTransferStatus({
      shopId: "shop-1",
      transferId: "tr-1",
      actorId: "user-1",
      status: "RECEIVED",
    });

    expect(row.status).toBe("RECEIVED");
    expect(sourceSave).toHaveBeenCalled();
    expect(WarehouseStock.findOneAndUpdate).toHaveBeenCalled();
  });
});
