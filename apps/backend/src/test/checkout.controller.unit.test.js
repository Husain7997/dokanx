jest.mock("@/core/checkout/checkout.engine", () => ({
  checkout: jest.fn(),
}));

const CheckoutEngine = require("@/core/checkout/checkout.engine");
const controller = require("../controllers/checkout.controller");

describe("checkout.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return success payload for checkout", async () => {
    CheckoutEngine.checkout.mockResolvedValue({
      orderId: "order-1",
      amount: 120,
    });

    const res = { json: jest.fn() };

    await controller.checkout(
      {
        user: { shopId: "shop-1", id: "user-1" },
        body: { items: [{ product: "p1", quantity: 1 }], totalAmount: 120 },
      },
      res,
      jest.fn()
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      orderId: "order-1",
      amount: 120,
    });
  });

  it("should forward checkout engine errors", async () => {
    const next = jest.fn();
    CheckoutEngine.checkout.mockRejectedValue(new Error("checkout failed"));

    await controller.checkout(
      {
        user: { shopId: "shop-1", id: "user-1" },
        body: { items: [{ product: "p1", quantity: 1 }], totalAmount: 120 },
      },
      { json: jest.fn() },
      next
    );

    expect(next).toHaveBeenCalled();
  });
});
