jest.mock("../modules/courier/models/courierShipment.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../modules/courier/courierProviderRegistry", () => ({
  getProvider: jest.fn(),
}));

const CourierShipment = require("../modules/courier/models/courierShipment.model");
const { getProvider } = require("../modules/courier/courierProviderRegistry");
const service = require("../modules/courier/courier.service");

describe("courier status fetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch provider shipment status", async () => {
    CourierShipment.findOne.mockResolvedValue({
      _id: "shipment-1",
      shopId: "shop-1",
      courier: "PATHAO",
      status: "CREATED",
      externalReference: "ext-1",
    });
    getProvider.mockReturnValue({
      fetchShipmentStatus: jest.fn().mockResolvedValue({
        provider: "PATHAO",
        normalizedResponse: { shipmentStatus: "IN_TRANSIT" },
      }),
    });

    const result = await service.fetchShipmentStatus({
      shopId: "shop-1",
      shipmentId: "shipment-1",
    });

    expect(result.normalizedResponse.shipmentStatus).toBe("IN_TRANSIT");
  });
});
