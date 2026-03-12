jest.mock("../modules/courier/models/courierShipment.model", () => ({
  find: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  updateOne: jest.fn(),
}));

jest.mock("../models/shop.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../platform/notifications/notification.service", () => ({
  enqueueNotification: jest.fn(),
}));

jest.mock("../modules/courier/courierProviderRegistry", () => ({
  getProvider: jest.fn(),
}));

const CourierShipment = require("../modules/courier/models/courierShipment.model");
const Order = require("../models/order.model");
const Shop = require("../models/shop.model");
const { enqueueNotification } = require("../platform/notifications/notification.service");
const { getProvider } = require("../modules/courier/courierProviderRegistry");
const service = require("../modules/courier/courier.service");

describe("courier polling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should poll and update active shipments", async () => {
    const shipment = {
      _id: "shipment-1",
      courier: "PATHAO",
      status: "CREATED",
      events: [],
      save: jest.fn().mockResolvedValue(true),
    };
    CourierShipment.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([shipment]),
      }),
    });
    getProvider.mockReturnValue({
      fetchShipmentStatus: jest.fn().mockResolvedValue({
        normalizedResponse: { shipmentStatus: "IN_TRANSIT" },
      }),
    });

    const result = await service.pollActiveShipmentStatuses({ limit: 10 });

    expect(result.polled).toBe(1);
    expect(result.updated).toBe(1);
    expect(shipment.status).toBe("IN_TRANSIT");
    expect(Order.updateOne).toHaveBeenCalled();
  });

  it("should escalate high severity courier anomalies", async () => {
    CourierShipment.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: "shipment-1",
              orderId: "order-1",
              shopId: "shop-1",
              courier: "PATHAO",
              status: "FAILED",
              updatedAt: new Date(),
            },
          ]),
        }),
      }),
    });
    Shop.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        owner: { _id: "owner-1", email: "owner@example.com" },
      }),
    });
    enqueueNotification.mockResolvedValue({ id: "job-1" });

    const result = await service.escalateCourierAnomalies({ shopId: "shop-1", limit: 5 });

    expect(result.notified).toBe(1);
    expect(enqueueNotification).toHaveBeenCalled();
  });
});
