jest.mock("../modules/supplier-marketplace/models/supplier.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../modules/supplier-marketplace/models/supplierOffer.model", () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../modules/supplier-marketplace/models/bulkOrderRequest.model", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
}));

const Supplier = require("../modules/supplier-marketplace/models/supplier.model");
const BulkOrderRequest = require("../modules/supplier-marketplace/models/bulkOrderRequest.model");
const service = require("../modules/supplier-marketplace/supplierMarketplace.service");

function mockSupplierScope(createdByShop) {
  Supplier.findOne.mockReturnValueOnce({
    select: () => ({
      lean: async () => ({ _id: "sup-1", createdByShop, isActive: true }),
    }),
  });
}

function buildOrder(status = "PENDING") {
  return {
    _id: "order-1",
    shopId: "buyer-shop",
    supplierId: "sup-1",
    status,
    statusHistory: [],
    save: jest.fn().mockResolvedValue(undefined),
  };
}

describe("Supplier Marketplace Bulk Order Lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow seller tenant to accept pending order", async () => {
    const order = buildOrder("PENDING");
    BulkOrderRequest.findById.mockResolvedValueOnce(order);
    mockSupplierScope("seller-shop");

    const result = await service.updateBulkOrderStatus({
      orderId: "order-1",
      actorShopId: "seller-shop",
      actorUserId: "user-1",
      action: "ACCEPT",
      note: "confirmed",
    });

    expect(result.idempotencyReplay).toBe(false);
    expect(order.status).toBe("ACCEPTED");
    expect(order.statusHistory).toHaveLength(1);
    expect(order.save).toHaveBeenCalled();
  });

  it("should reject accept action from buyer tenant", async () => {
    const order = buildOrder("PENDING");
    BulkOrderRequest.findById.mockResolvedValueOnce(order);
    mockSupplierScope("seller-shop");

    await expect(
      service.updateBulkOrderStatus({
        orderId: "order-1",
        actorShopId: "buyer-shop",
        actorUserId: "user-2",
        action: "ACCEPT",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("should allow buyer tenant to cancel pending order", async () => {
    const order = buildOrder("PENDING");
    BulkOrderRequest.findById.mockResolvedValueOnce(order);
    mockSupplierScope("seller-shop");

    const result = await service.updateBulkOrderStatus({
      orderId: "order-1",
      actorShopId: "buyer-shop",
      actorUserId: "user-2",
      action: "CANCEL",
      note: "no longer needed",
    });

    expect(result.idempotencyReplay).toBe(false);
    expect(order.status).toBe("CANCELLED");
    expect(order.statusHistory).toHaveLength(1);
  });

  it("should block invalid transition from ACCEPTED to REJECT", async () => {
    const order = buildOrder("ACCEPTED");
    BulkOrderRequest.findById.mockResolvedValueOnce(order);
    mockSupplierScope("seller-shop");

    await expect(
      service.updateBulkOrderStatus({
        orderId: "order-1",
        actorShopId: "seller-shop",
        actorUserId: "user-1",
        action: "REJECT",
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("Supplier Marketplace Reliability Helpers", () => {
  it("should give better score to faster fulfillment", () => {
    const fast = service._internals.buildReliabilityScore({
      fulfillmentRate: 80,
      acceptanceRate: 90,
      avgFulfillmentHours: 20,
      verified: true,
      ratingAverage: 4.5,
    });

    const slow = service._internals.buildReliabilityScore({
      fulfillmentRate: 80,
      acceptanceRate: 90,
      avgFulfillmentHours: 140,
      verified: true,
      ratingAverage: 4.5,
    });

    expect(fast).toBeGreaterThan(slow);
  });
});
