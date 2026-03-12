jest.mock("../models/order.model", () => ({
  findById: jest.fn(),
}));

const Order = require("../models/order.model");
const { _internals } = require("../workers/settlement.queue.worker");

describe("settlement.queue.worker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should resolve direct settlement payload from job data", async () => {
    const result = await _internals.resolveSettlementJobPayload({
      id: "job-1",
      data: {
        shopId: "shop-1",
        grossAmount: 500,
        fee: 5,
      },
    });

    expect(result).toEqual({
      shopId: "shop-1",
      grossAmount: 500,
      fee: 5,
      idempotencyKey: "settlement_job_job-1",
    });
  });

  it("should resolve settlement payload from orderId", async () => {
    Order.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "order-1",
        shopId: "shop-1",
        totalAmount: 350,
      }),
    });

    const result = await _internals.resolveSettlementJobPayload({
      id: "job-2",
      data: {
        orderId: "order-1",
      },
    });

    expect(result).toEqual({
      shopId: "shop-1",
      grossAmount: 350,
      fee: 0,
      idempotencyKey: "settlement_order_order-1",
    });
  });

  it("should skip when order does not exist", async () => {
    Order.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    const result = await _internals.resolveSettlementJobPayload({
      id: "job-3",
      data: {
        orderId: "missing",
      },
    });

    expect(result).toBeNull();
  });
});
