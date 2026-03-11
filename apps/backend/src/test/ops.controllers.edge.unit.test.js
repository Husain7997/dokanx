jest.mock("../modules/support/support.service", () => ({
  getTicket: jest.fn(),
  updateTicketStatus: jest.fn(),
}));

jest.mock("../modules/courier/courier.service", () => ({
  getShipment: jest.fn(),
  reconcileCod: jest.fn(),
  applyWebhookEvent: jest.fn(),
}));

jest.mock("../modules/warehouse/warehouse.service", () => ({
  createTransferRequest: jest.fn(),
  updateTransferStatus: jest.fn(),
}));

const supportController = require("../modules/support/support.controller");
const supportService = require("../modules/support/support.service");
const courierController = require("../modules/courier/courier.controller");
const courierService = require("../modules/courier/courier.service");
const warehouseController = require("../modules/warehouse/warehouse.controller");
const warehouseService = require("../modules/warehouse/warehouse.service");

function createRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("ops controllers edge cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject support getTicket without shop context", async () => {
    const res = createRes();

    await supportController.getTicket(
      { params: { ticketId: "t1" }, user: null, shop: null },
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Shop context missing",
    });
  });

  it("should return support not found when ticket is missing", async () => {
    supportService.getTicket.mockResolvedValue(null);
    const res = createRes();

    await supportController.getTicket(
      { params: { ticketId: "t1" }, shop: { _id: "shop-1" }, lang: "en" },
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Ticket not found",
    });
  });

  it("should map support status update service errors", async () => {
    supportService.updateTicketStatus.mockRejectedValue(
      Object.assign(new Error("Ticket not found"), { statusCode: 404 })
    );
    const res = createRes();

    await supportController.updateTicketStatus(
      {
        params: { ticketId: "t1" },
        body: { status: "RESOLVED" },
        shop: { _id: "shop-1" },
        user: { _id: "u1", role: "ADMIN" },
      },
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Ticket not found",
    });
  });

  it("should return shipment not found when courier shipment is missing", async () => {
    courierService.getShipment.mockResolvedValue(null);
    const res = createRes();

    await courierController.getShipment(
      { params: { shipmentId: "s1" }, shop: { _id: "shop-1" }, lang: "en" },
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Shipment not found",
    });
  });

  it("should map courier reconcile errors", async () => {
    courierService.reconcileCod.mockRejectedValue(
      Object.assign(new Error("Shipment not found"), { statusCode: 404 })
    );
    const res = createRes();

    await courierController.reconcileCod(
      {
        params: { shipmentId: "s1" },
        body: { actualAmount: 100 },
        shop: { _id: "shop-1" },
      },
      res
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Shipment not found",
    });
  });

  it("should map courier webhook service errors", async () => {
    courierService.applyWebhookEvent.mockRejectedValue(
      Object.assign(new Error("Shipment not found"), { statusCode: 404 })
    );
    const res = createRes();

    await courierController.handleWebhook(
      {
        body: { trackingCode: "PAT-1" },
      },
      res
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Shipment not found",
    });
  });

  it("should map warehouse transfer creation errors", async () => {
    warehouseService.createTransferRequest.mockRejectedValue(
      Object.assign(new Error("Insufficient stock in source warehouse"), { statusCode: 400 })
    );
    const res = createRes();

    await warehouseController.createTransferRequest(
      {
        body: { productId: "p1" },
        shop: { _id: "shop-1" },
        user: { _id: "u1" },
      },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Insufficient stock in source warehouse",
    });
  });

  it("should map warehouse transfer status errors", async () => {
    warehouseService.updateTransferStatus.mockRejectedValue(
      Object.assign(new Error("Transfer not found"), { statusCode: 404 })
    );
    const res = createRes();

    await warehouseController.updateTransferStatus(
      {
        params: { transferId: "tr1" },
        body: { status: "RECEIVED" },
        shop: { _id: "shop-1" },
        user: { _id: "u1" },
      },
      res
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Transfer not found",
    });
  });

  it("should reject warehouse export without shop context", async () => {
    const res = createRes();

    await warehouseController.exportWarehouseStocksCSV(
      { user: null, shop: null, query: {} },
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Shop context missing",
    });
  });
});
