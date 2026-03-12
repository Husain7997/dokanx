jest.mock("mongoose", () => ({
  startSession: jest.fn(),
}));

jest.mock("../modules/pos/models/posSyncQueue.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  create: jest.fn(),
}));

jest.mock("../models/paymentAttempt.model", () => ({
  create: jest.fn(),
}));

jest.mock("../modules/pos/models/posSession.model", () => ({
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../modules/pos/models/posSale.model", () => ({
  create: jest.fn(),
}));

jest.mock("../modules/pos/models/posPayment.model", () => ({
  create: jest.fn(),
}));

jest.mock("@/inventory", () => ({
  createInventoryEntry: jest.fn(),
}));

jest.mock("@/platform/events/event.publisher", () => ({
  publishDomainEvent: jest.fn(),
}));

jest.mock("@/core/infrastructure", () => ({
  addJob: jest.fn(),
}));

const mongoose = require("mongoose");
const PosSyncQueue = require("../modules/pos/models/posSyncQueue.model");
const Order = require("../models/order.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const PosSession = require("../modules/pos/models/posSession.model");
const PosSale = require("../modules/pos/models/posSale.model");
const PosPayment = require("../modules/pos/models/posPayment.model");
const inventory = require("@/inventory");
const { publishDomainEvent } = require("@/platform/events/event.publisher");
const { addJob } = require("@/core/infrastructure");
const service = require("../modules/pos/pos.service");

describe("pos.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should deduplicate offline queue items", async () => {
    PosSyncQueue.findOne.mockResolvedValue({ _id: "queue-1" });

    const result = await service.enqueueOfflineSale({
      shopId: "shop-1",
      terminalId: "terminal-1",
      clientMutationId: "mut-1",
      payload: { items: [{ productId: "p1", quantity: 1 }] },
      paymentTypes: ["cash"],
    });

    expect(result.duplicate).toBe(true);
    expect(PosSyncQueue.create).not.toHaveBeenCalled();
  });

  it("should open a POS session", async () => {
    PosSession.findOneAndUpdate.mockResolvedValue({ _id: "session-1", status: "OPEN" });

    const row = await service.openSession({
      shopId: "shop-1",
      terminalId: "terminal-1",
      openedBy: "user-1",
    });

    expect(PosSession.findOneAndUpdate).toHaveBeenCalled();
    expect(row.status).toBe("OPEN");
  });

  it("should sync pending queue items", async () => {
    const save1 = jest.fn();
    const save2 = jest.fn();
    PosSyncQueue.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { status: "PENDING", attemptCount: 0, save: save1 },
        { status: "FAILED", attemptCount: 2, save: save2 },
      ]),
    });

    const result = await service.syncOfflineQueue({
      shopId: "shop-1",
      processor: async row => row,
    });

    expect(result).toEqual({ synced: 2, failed: 0, total: 2 });
    expect(save1).toHaveBeenCalled();
    expect(save2).toHaveBeenCalled();
  });

  it("should process queue item into order, payment and inventory mutation", async () => {
    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    mongoose.startSession.mockResolvedValue(session);
    Order.create.mockResolvedValue([{ _id: "order-1" }]);
    PaymentAttempt.create.mockResolvedValue([{ _id: "attempt-1" }]);
    PosSession.findOneAndUpdate.mockResolvedValue({ _id: "session-1" });
    PosSale.create.mockResolvedValue([{ _id: "sale-1" }]);
    PosPayment.create.mockResolvedValue([{ _id: "pay-1" }]);
    inventory.createInventoryEntry.mockResolvedValue({ productId: "p1", stock: 4 });

    const result = await service._internals.processOfflineQueueItem({
      _id: "queue-1",
      shopId: "shop-1",
      terminalId: "terminal-1",
      clientMutationId: "mut-1",
      paymentTypes: ["cash"],
      payload: {
        items: [{ productId: "p1", quantity: 1, price: 50 }],
        totals: { grandTotal: 50 },
        customer: { phone: "01700000000" },
      },
    });

    expect(Order.create).toHaveBeenCalled();
    expect(PaymentAttempt.create).toHaveBeenCalled();
    expect(PosSession.findOneAndUpdate).toHaveBeenCalled();
    expect(PosSale.create).toHaveBeenCalled();
    expect(PosPayment.create).toHaveBeenCalled();
    expect(inventory.createInventoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: "shop-1",
        productId: "p1",
        quantity: 1,
        type: "POS_SALE",
      })
    );
    expect(publishDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "POS_SYNC_COMPLETED",
        tenantId: "shop-1",
        aggregateId: "order-1",
      })
    );
    expect(addJob).toHaveBeenCalledWith("settlement", {
      shopId: "shop-1",
      grossAmount: 50,
      fee: 0,
      idempotencyKey: "pos_settlement_shop-1_terminal-1_mut-1",
    });
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(result._id).toBe("order-1");
  });
});
