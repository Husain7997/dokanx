jest.mock("mongoose", () => ({
  startSession: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  findById: jest.fn(),
}));

jest.mock("@/core/infrastructure", () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

const mongoose = require("mongoose");
const Order = require("../models/order.model");
const { eventBus } = require("@/core/infrastructure");
const EVENTS = require("../domain/events");
const service = require("../services/orderState.service");

describe("orderState.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should transition confirmed order to shipped and commit transaction", async () => {
    const commitTransaction = jest.fn();
    const abortTransaction = jest.fn();
    const endSession = jest.fn();
    const session = {
      startTransaction: jest.fn(),
      commitTransaction,
      abortTransaction,
      endSession,
    };
    const save = jest.fn();
    const order = {
      _id: "order-1",
      shop: "shop-1",
      status: "CONFIRMED",
      items: [{ product: "p1", quantity: 1 }],
      save,
    };

    mongoose.startSession.mockResolvedValue(session);
    Order.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(order),
    });

    const result = await service.transitionOrder({
      orderId: "order-1",
      nextStatus: "SHIPPED",
    });

    expect(save).toHaveBeenCalledWith({ session });
    expect(commitTransaction).toHaveBeenCalled();
    expect(abortTransaction).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
    expect(endSession).toHaveBeenCalled();
    expect(result.status).toBe("SHIPPED");
  });

  it("should emit confirmation event for confirmed transition", async () => {
    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    const order = {
      _id: "order-1",
      shop: "shop-1",
      status: "PAYMENT_PENDING",
      items: [{ product: "p1", quantity: 1 }],
      save: jest.fn(),
    };

    mongoose.startSession.mockResolvedValue(session);
    Order.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(order),
    });

    await service.transitionOrder({
      orderId: "order-1",
      nextStatus: "CONFIRMED",
    });

    expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.ORDER_CONFIRMED, {
      orderId: "order-1",
      shopId: "shop-1",
      items: [{ product: "p1", quantity: 1 }],
    });
  });

  it("should emit packed event for packed transition", async () => {
    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    const order = {
      _id: "order-1",
      shopId: "shop-1",
      status: "CONFIRMED",
      items: [{ product: "p1", quantity: 1 }],
      save: jest.fn(),
    };

    mongoose.startSession.mockResolvedValue(session);
    Order.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(order),
    });

    await service.transitionOrder({
      orderId: "order-1",
      nextStatus: "PACKED",
    });

    expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.ORDER_PACKED, {
      orderId: "order-1",
      shopId: "shop-1",
      items: [{ product: "p1", quantity: 1 }],
    });
  });

  it("should emit returned event for returned transition", async () => {
    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    const order = {
      _id: "order-1",
      shopId: "shop-1",
      status: "DELIVERED",
      items: [{ product: "p1", quantity: 1 }],
      save: jest.fn(),
    };

    mongoose.startSession.mockResolvedValue(session);
    Order.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(order),
    });

    await service.transitionOrder({
      orderId: "order-1",
      nextStatus: "RETURNED",
    });

    expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.ORDER_RETURNED, {
      orderId: "order-1",
      shopId: "shop-1",
      items: [{ product: "p1", quantity: 1 }],
    });
  });

  it("should abort transaction on illegal transition", async () => {
    const abortTransaction = jest.fn();
    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction,
      endSession: jest.fn(),
    };
    const order = {
      _id: "order-1",
      shop: "shop-1",
      status: "DELIVERED",
      items: [],
      save: jest.fn(),
    };

    mongoose.startSession.mockResolvedValue(session);
    Order.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(order),
    });

    await expect(
      service.transitionOrder({
        orderId: "order-1",
        nextStatus: "SHIPPED",
      })
    ).rejects.toThrow("Illegal transition");

    expect(abortTransaction).toHaveBeenCalled();
  });
});
