jest.mock("../modules/trust/models/shopReview.model", () => ({
  create: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../modules/trust/models/productReview.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../modules/trust/models/buyerClaim.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  findOne: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../models/shop.model", () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

const ShopReview = require("../modules/trust/models/shopReview.model");
const ProductReview = require("../modules/trust/models/productReview.model");
const BuyerClaim = require("../modules/trust/models/buyerClaim.model");
const Order = require("../models/order.model");
const Shop = require("../models/shop.model");
const service = require("../modules/trust/trust.service");

describe("trust.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create shop review and recalculate reputation", async () => {
    Order.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "order-1" }) });
    ShopReview.create.mockResolvedValue({ _id: "review-1" });
    ShopReview.aggregate.mockResolvedValue([{ averageRating: 4.5, reviewCount: 2 }]);
    Order.aggregate.mockResolvedValue([{ totalOrders: 10, deliveredOrders: 8, cancelledOrders: 1, returnedOrders: 1 }]);
    Shop.findByIdAndUpdate.mockResolvedValue(true);

    const result = await service.createShopReview({
      shopId: "shop-1",
      customerId: "user-1",
      payload: { orderId: "order-1", rating: 5, reviewText: "Good" },
    });

    expect(ShopReview.create).toHaveBeenCalled();
    expect(Shop.findByIdAndUpdate).toHaveBeenCalledWith(
      "shop-1",
      expect.objectContaining({
        $set: expect.objectContaining({
          ratingAverage: 4.5,
          ratingCount: 2,
        }),
      })
    );
    expect(result.review._id).toBe("review-1");
  });

  it("should create buyer claim for customer order", async () => {
    Order.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "order-1" }) });
    BuyerClaim.create.mockResolvedValue({ _id: "claim-1", status: "OPEN" });

    const row = await service.createBuyerClaim({
      shopId: "shop-1",
      customerId: "user-1",
      payload: {
        orderId: "order-1",
        issueType: "DAMAGED_PRODUCT",
        description: "Damaged on arrival",
      },
    });

    expect(row._id).toBe("claim-1");
  });

  it("should create product review only for delivered order", async () => {
    Order.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "order-1" }) });
    ProductReview.create.mockResolvedValue({ _id: "product-review-1" });

    const row = await service.createProductReview({
      shopId: "shop-1",
      customerId: "user-1",
      payload: {
        orderId: "order-1",
        productId: "prod-1",
        rating: 4,
      },
    });

    expect(row._id).toBe("product-review-1");
  });
});
