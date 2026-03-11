jest.mock("../models/cart.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../modules/marketing/marketing.service", () => ({
  evaluateCoupon: jest.fn(),
}));

const Cart = require("../models/cart.model");
const marketingService = require("../modules/marketing/marketing.service");
const cartService = require("../modules/cart/cart.service");

describe("cart coupon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should apply coupon to cart", async () => {
    const cart = {
      totals: { subtotal: 1000, quantity: 2 },
      appliedCoupon: {},
      save: jest.fn().mockResolvedValue(true),
      toObject: () => ({
        totals: { subtotal: 1000, discountTotal: 100, grandTotal: 900 },
      }),
    };
    Cart.findOne.mockResolvedValue(cart);
    marketingService.evaluateCoupon.mockResolvedValue({
      valid: true,
      coupon: { code: "SAVE10", type: "PERCENTAGE" },
      effect: { discountValue: 100 },
    });

    const row = await cartService.applyCouponToCart({
      shopId: "shop-1",
      userId: "user-1",
      code: "SAVE10",
    });

    expect(cart.save).toHaveBeenCalled();
    expect(row.totals.grandTotal).toBe(900);
  });

  it("should remove coupon from cart", async () => {
    const cart = {
      totals: { subtotal: 1000, discountTotal: 100, grandTotal: 900 },
      appliedCoupon: { code: "SAVE10" },
      save: jest.fn().mockResolvedValue(true),
      toObject: () => ({
        totals: { subtotal: 1000, discountTotal: 0, grandTotal: 1000 },
      }),
    };
    Cart.findOne.mockResolvedValue(cart);

    const row = await cartService.removeCouponFromCart({
      shopId: "shop-1",
      userId: "user-1",
    });

    expect(cart.save).toHaveBeenCalled();
    expect(row.totals.grandTotal).toBe(1000);
  });
});
