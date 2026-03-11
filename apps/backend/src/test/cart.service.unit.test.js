jest.mock("../models/cart.model", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
}));

jest.mock("../models/product.model", () => ({
  find: jest.fn(),
}));

const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const cartService = require("../modules/cart/cart.service");

describe("cart.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should compute cart totals from shop products", async () => {
    Product.find.mockReturnValue({
      lean: async () => [
        {
          _id: "prod-1",
          name: "Soap",
          imageUrl: "",
          price: 50,
          isActive: true,
        },
      ],
    });
    Cart.findOneAndUpdate.mockReturnValue({
      lean: async () => ({
        items: [{ productId: "prod-1", quantity: 2, lineTotal: 100 }],
        totals: { itemCount: 1, quantity: 2, subtotal: 100 },
        guestToken: "cart_1",
      }),
    });

    const cart = await cartService.saveCart({
      shopId: "shop-1",
      guestToken: "cart_1",
      items: [{ productId: "prod-1", quantity: 2 }],
    });

    expect(cart.totals.subtotal).toBe(100);
  });
});
