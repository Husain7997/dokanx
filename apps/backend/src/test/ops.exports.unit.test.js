jest.mock("../modules/warehouse/warehouse.service", () => ({
  buildWarehouseStockExportRows: jest.fn(),
  buildTransferExportRows: jest.fn(),
}));

jest.mock("../modules/courier/courier.service", () => ({
  buildShipmentExportRows: jest.fn(),
}));

jest.mock("../modules/support/support.service", () => ({
  buildTicketExportRows: jest.fn(),
}));

const warehouseController = require("../modules/warehouse/warehouse.controller");
const warehouseService = require("../modules/warehouse/warehouse.service");
const courierController = require("../modules/courier/courier.controller");
const courierService = require("../modules/courier/courier.service");
const supportController = require("../modules/support/support.controller");
const supportService = require("../modules/support/support.service");

function createRes() {
  return {
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("ops export controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export warehouse stocks csv", async () => {
    warehouseService.buildWarehouseStockExportRows.mockResolvedValue([
      { warehouseId: "w1", productId: "p1", available: 4 },
    ]);
    const res = createRes();

    await warehouseController.exportWarehouseStocksCSV(
      { shop: { _id: "shop-1" }, query: {} },
      res,
      jest.fn()
    );

    expect(res.headers["Content-Type"]).toBe("text/csv");
    expect(res.body).toContain("warehouseId");
  });

  it("should export courier shipments csv", async () => {
    courierService.buildShipmentExportRows.mockResolvedValue([
      { shipmentId: "s1", trackingCode: "PAT-1", status: "DELIVERED" },
    ]);
    const res = createRes();

    await courierController.exportShipmentsCSV(
      { shop: { _id: "shop-1" }, query: {} },
      res,
      jest.fn()
    );

    expect(res.headers["Content-Disposition"]).toContain("courier-shipments.csv");
    expect(res.body).toContain("shipmentId");
  });

  it("should export support tickets csv", async () => {
    supportService.buildTicketExportRows.mockResolvedValue([
      { ticketId: "t1", subject: "Need help", status: "OPEN" },
    ]);
    const res = createRes();

    await supportController.exportTicketsCSV(
      { shop: { _id: "shop-1" }, query: {} },
      res,
      jest.fn()
    );

    expect(res.headers["Content-Disposition"]).toContain("support-tickets.csv");
    expect(res.body).toContain("ticketId");
  });
});
