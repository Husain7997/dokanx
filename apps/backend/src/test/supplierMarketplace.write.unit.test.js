jest.mock("../modules/supplier-marketplace/models/supplier.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../modules/supplier-marketplace/models/supplierOffer.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../modules/supplier-marketplace/models/bulkOrderRequest.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const Supplier = require("../modules/supplier-marketplace/models/supplier.model");
const SupplierOffer = require("../modules/supplier-marketplace/models/supplierOffer.model");
const BulkOrderRequest = require("../modules/supplier-marketplace/models/bulkOrderRequest.model");
const service = require("../modules/supplier-marketplace/supplierMarketplace.service");

describe("Supplier Marketplace Write Path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject offer write when supplier does not belong to tenant", async () => {
    Supplier.findOne.mockResolvedValueOnce({
      _id: "s1",
      isActive: true,
      createdByShop: "shop-b",
    });

    await expect(
      service.createSupplierOffer({
        supplierId: "s1",
        shopId: "shop-a",
        payload: { title: "Offer", wholesalePrice: 100 },
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("should return idempotency replay for duplicate bulk order key", async () => {
    Supplier.findOne.mockReturnValueOnce({
      lean: async () => ({ _id: "s1", isActive: true }),
    });

    BulkOrderRequest.findOne.mockResolvedValueOnce({
      _id: "bo1",
      idempotencyKey: "idem-1",
    });

    const result = await service.createBulkOrderRequest({
      shopId: "shop-a",
      supplierId: "s1",
      items: [{ offerId: "o1", quantity: 2 }],
      idempotencyKey: "idem-1",
    });

    expect(result.idempotencyReplay).toBe(true);
    expect(result.order._id).toBe("bo1");
  });

  it("should create bulk order with computed totals", async () => {
    Supplier.findOne.mockReturnValueOnce({
      lean: async () => ({ _id: "s1", isActive: true }),
    });

    BulkOrderRequest.findOne.mockResolvedValueOnce(null);

    SupplierOffer.find.mockReturnValueOnce({
      lean: async () => [
        { _id: "o1", supplierId: "s1", title: "Soap", wholesalePrice: 50, minOrderQty: 1, availableQty: 100 },
        { _id: "o2", supplierId: "s1", title: "Shampoo", wholesalePrice: 80, minOrderQty: 1, availableQty: 50 },
      ],
    });

    BulkOrderRequest.create.mockResolvedValueOnce({
      _id: "bo2",
      totalAmount: 210,
      lines: [],
    });

    const result = await service.createBulkOrderRequest({
      shopId: "shop-a",
      supplierId: "s1",
      items: [
        { offerId: "o1", quantity: 1 },
        { offerId: "o2", quantity: 2 },
      ],
      idempotencyKey: "idem-2",
    });

    expect(result.idempotencyReplay).toBe(false);
    expect(BulkOrderRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-a",
        supplierId: "s1",
        totalAmount: 210,
      })
    );
  });
});
