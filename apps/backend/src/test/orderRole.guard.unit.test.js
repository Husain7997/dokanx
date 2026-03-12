jest.mock("../models/order.model", () => ({
  findById: jest.fn(),
}));

const Order = require("../models/order.model");
const { canUpdateOrderStatus } = require("../middlewares/orderRole.guard");

describe("orderRole.guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow valid owner transition", async () => {
    Order.findById.mockResolvedValue({ status: "CONFIRMED" });

    const req = {
      params: { orderId: "order-1" },
      body: { status: "shipped" },
      user: { role: "OWNER" },
    };
    const res = {
      status: jest.fn(() => ({ json: jest.fn() })),
    };
    const next = jest.fn();

    await canUpdateOrderStatus(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should block customer from non-cancel transition", async () => {
    Order.findById.mockResolvedValue({ status: "CONFIRMED" });

    const json = jest.fn();
    const req = {
      params: { orderId: "order-1" },
      body: { status: "shipped" },
      user: { role: "customer" },
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };
    const next = jest.fn();

    await canUpdateOrderStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: "Unauthorized role" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow packed transition for owner", async () => {
    Order.findById.mockResolvedValue({ status: "CONFIRMED" });

    const req = {
      params: { orderId: "order-1" },
      body: { status: "packed" },
      user: { role: "OWNER" },
    };
    const res = {
      status: jest.fn(() => ({ json: jest.fn() })),
    };
    const next = jest.fn();

    await canUpdateOrderStatus(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
