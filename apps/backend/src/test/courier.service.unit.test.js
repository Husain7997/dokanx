jest.mock("../models/order.model", () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../modules/courier/models/courierShipment.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

const Order = require("../models/order.model");
const CourierShipment = require("../modules/courier/models/courierShipment.model");
const service = require("../modules/courier/courier.service");

describe("courier.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create shipment with generated tracking code", async () => {
    Order.findOne.mockResolvedValue({ _id: "order-1", shopId: "shop-1" });
    CourierShipment.create.mockImplementation(async payload => payload);

    const shipment = await service.createShipment({
      shopId: "shop-1",
      actorId: "user-1",
      payload: {
        orderId: "order-1",
        courier: "pathao",
        recipient: {
          name: "Customer",
          phone: "01700000000",
          address: "Dhaka",
        },
      },
    });

    expect(shipment.courier).toBe("PATHAO");
    expect(shipment.trackingCode).toMatch(/^PAT-/);
  });

  it("should mark cod reconciliation as mismatch", async () => {
    const save = jest.fn().mockResolvedValue(true);
    CourierShipment.findOne.mockResolvedValue({
      _id: "ship-1",
      shopId: "shop-1",
      orderId: "order-1",
      cashOnDeliveryAmount: 500,
      codCollectedAmount: 0,
      codReconciliationStatus: "PENDING",
      status: "DELIVERED",
      events: [],
      save,
    });

    const shipment = await service.reconcileCod({
      shopId: "shop-1",
      shipmentId: "ship-1",
      actualAmount: 450,
    });

    expect(shipment.codReconciliationStatus).toBe("MISMATCH");
    expect(save).toHaveBeenCalled();
  });

  it("should update order status on delivered webhook", async () => {
    const save = jest.fn().mockResolvedValue(true);
    CourierShipment.findOne.mockResolvedValue({
      _id: "ship-1",
      shopId: "shop-1",
      orderId: "order-1",
      courier: "PATHAO",
      trackingCode: "PAT-123",
      cashOnDeliveryAmount: 300,
      codCollectedAmount: 0,
      codReconciliationStatus: "PENDING",
      status: "CREATED",
      events: [],
      save,
    });

    const shipment = await service.applyWebhookEvent({
      payload: {
        courier: "pathao",
        trackingCode: "PAT-123",
        event: "DELIVERED",
        codCollectedAmount: 300,
      },
    });

    expect(shipment.status).toBe("DELIVERED");
    expect(shipment.codReconciliationStatus).toBe("MATCHED");
    expect(Order.updateOne).toHaveBeenCalledWith(
      { _id: "order-1", shopId: "shop-1" },
      { $set: { status: "DELIVERED" } }
    );
  });
});
