jest.mock("../models/user.model", () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock("../models/shop.model", () => ({
  findByIdAndUpdate: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  find: jest.fn(() => ({
    populate: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock("../models/audit.model", () => ({
  find: jest.fn(() => ({
    sort: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock("../utils/audit.util", () => ({
  createAudit: jest.fn(),
}));

const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const { createAudit } = require("../utils/audit.util");
const controller = require("../controllers/admin.controller");

describe("admin.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 when blocking a missing user", async () => {
    User.findByIdAndUpdate.mockResolvedValue(null);

    const req = { params: { id: "u-1" }, user: { _id: "admin-1" }, lang: "en" };
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };
    const next = jest.fn();

    await controller.blockUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
    expect(createAudit).not.toHaveBeenCalled();
  });

  it("should write consistent audit metadata when approving a shop", async () => {
    Shop.findByIdAndUpdate.mockResolvedValue({ _id: "shop-1" });

    const req = { params: { id: "shop-1" }, user: { _id: "admin-1" }, lang: "en" };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await controller.approveShop(req, res, next);

    expect(createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        performedBy: "admin-1",
        action: "APPROVE_SHOP",
        targetType: "Shop",
        targetId: "shop-1",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
