jest.mock("../modules/customer/customer.identity.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const CustomerIdentity = require("../modules/customer/customer.identity.model");
const service = require("../modules/customer/customer.index.service");

describe("customer.index.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create tenant-scoped customer identity", async () => {
    CustomerIdentity.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    CustomerIdentity.create.mockResolvedValue({
      _id: "cust-1",
      shopId: "shop-1",
      phone: "01700000000",
      name: "Rahim",
    });

    const row = await service.findOrCreateCustomer({
      shopId: "shop-1",
      phone: "01700000000",
      name: "Rahim",
    });

    expect(CustomerIdentity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        phone: "01700000000",
        name: "Rahim",
      })
    );
    expect(row._id).toBe("cust-1");
  });
});
