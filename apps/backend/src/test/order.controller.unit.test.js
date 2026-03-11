jest.mock("mongoose", () => ({
  startSession: jest.fn(),
}));

jest.mock("../services/orderState.service", () => ({
  transitionOrder: jest.fn(),
}));

jest.mock("../models/order.model", () => ({}));

jest.mock("@/core/checkout/checkout.engine", () => ({
  checkout: jest.fn(),
}));

jest.mock("@/core/infrastructure", () => ({
  publishEvent: jest.fn(),
  addJob: jest.fn(),
  logger: {
    info: jest.fn(),
  },
  t: jest.fn(() => "order created"),
}));

jest.mock("@/modules/marketing/marketingTrigger.service", () => ({
  triggerFirstPurchaseFlow: jest.fn(),
}));

jest.mock("@/modules/cart/cart.service", () => ({
  clearCart: jest.fn(),
}));

jest.mock("@/modules/marketing/marketing.service", () => ({
  evaluateCoupon: jest.fn(),
}));

const mongoose = require("mongoose");
const CheckoutEngine = require("@/core/checkout/checkout.engine");
const { publishEvent, addJob, t } = require("@/core/infrastructure");
const { triggerFirstPurchaseFlow } = require("@/modules/marketing/marketingTrigger.service");
const cartService = require("@/modules/cart/cart.service");
const marketingService = require("@/modules/marketing/marketing.service");
const { transitionOrder } = require("../services/orderState.service");
const controller = require("../controllers/order.controller");

describe("order.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should apply coupon pricing snapshot when placing an order", async () => {
    const session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn(),
    };
    mongoose.startSession.mockResolvedValue(session);

    const save = jest.fn();
    const order = {
      _id: "order-1",
      save,
    };
    CheckoutEngine.checkout.mockResolvedValue(order);
    marketingService.evaluateCoupon.mockResolvedValue({
      valid: true,
      coupon: {
        code: "SAVE10",
        type: "PERCENTAGE",
      },
      effect: {
        discountValue: 10,
      },
    });

    const json = jest.fn();
    const req = {
      shop: { _id: "shop-1" },
      user: { _id: "user-1" },
      lang: "bn",
      body: {
        totalAmount: 100,
        shippingFee: 0,
        couponCode: "SAVE10",
        items: [{ product: "prod-1", quantity: 2, price: 50 }],
      },
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.placeOrder(req, res);

    expect(marketingService.evaluateCoupon).toHaveBeenCalledWith({
      shopId: "shop-1",
      code: "SAVE10",
      cartSubtotal: 100,
      shippingFee: 0,
      itemCount: 2,
    });
    expect(CheckoutEngine.checkout).toHaveBeenCalledWith({
      shopId: req.shop,
      user: req.user,
      items: req.body.items,
      totalAmount: 90,
      session,
    });
    expect(order.pricing).toEqual({
      subtotal: 100,
      discountTotal: 10,
      grandTotal: 90,
    });
    expect(order.appliedCoupon).toEqual({
      code: "SAVE10",
      type: "PERCENTAGE",
      discountValue: 10,
    });
    expect(save).toHaveBeenCalledWith({ session });
    expect(cartService.clearCart).toHaveBeenCalledWith({
      shopId: "shop-1",
      userId: "user-1",
    });
    expect(addJob).toHaveBeenCalledWith("settlement", { orderId: "order-1" });
    expect(publishEvent).toHaveBeenCalledWith({
      type: "ORDER_CREATED",
      aggregateId: "order-1",
      payload: order,
    });
    expect(triggerFirstPurchaseFlow).toHaveBeenCalledWith({
      order,
      logger: expect.any(Object),
    });
    expect(t).toHaveBeenCalledWith("order.created", "bn");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      message: "order created",
      data: order,
    });
    expect(session.endSession).toHaveBeenCalled();
  });

  it("should reject invalid coupon before checkout", async () => {
    const session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn(),
    };
    mongoose.startSession.mockResolvedValue(session);
    marketingService.evaluateCoupon.mockResolvedValue({
      valid: false,
      reason: "Coupon invalid",
    });

    const json = jest.fn();
    const req = {
      shop: { _id: "shop-1" },
      user: { _id: "user-1" },
      body: {
        totalAmount: 100,
        couponCode: "BADCODE",
        items: [],
      },
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.placeOrder(req, res);

    expect(CheckoutEngine.checkout).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Coupon invalid",
    });
    expect(session.endSession).toHaveBeenCalled();
  });

  it("should return updated order status", async () => {
    transitionOrder.mockResolvedValue({
      _id: "order-1",
      status: "SHIPPED",
    });

    const res = {
      json: jest.fn(),
    };

    await controller.updateOrderStatus(
      {
        params: { orderId: "order-1" },
        body: { status: "SHIPPED" },
        lang: "en",
      },
      res
    );

    expect(transitionOrder).toHaveBeenCalledWith({
      orderId: "order-1",
      nextStatus: "SHIPPED",
    });
    expect(res.json).toHaveBeenCalledWith({
      message: "order created",
      order: {
        _id: "order-1",
        status: "SHIPPED",
      },
    });
  });

  it("should return 400 when order status transition fails", async () => {
    transitionOrder.mockRejectedValue(new Error("Illegal transition"));

    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.updateOrderStatus(
      {
        params: { orderId: "order-1" },
        body: { status: "DELIVERED" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: "Illegal transition",
    });
  });
});
