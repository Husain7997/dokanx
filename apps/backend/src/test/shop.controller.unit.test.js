jest.mock("../models/shop.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../models/user.model", () => ({
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../utils/audit.util", () => ({
  createAudit: jest.fn(),
}));

const Shop = require("../models/shop.model");
const User = require("../models/user.model");
const { createAudit } = require("../utils/audit.util");
const controller = require("../controllers/shop.controller");

describe("shop.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a shop and respond once", async () => {
    Shop.create.mockResolvedValue({ _id: "shop-1", name: "Demo" });
    User.findByIdAndUpdate.mockResolvedValue({});

    const json = jest.fn();
    const req = {
      body: { name: "Demo" },
      user: { _id: "user-1", shopId: null, save: jest.fn().mockResolvedValue({}) },
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.createShop(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledTimes(1);
    expect(createAudit).toHaveBeenCalled();
  });

  it("should return 404 when blocking a missing customer", async () => {
    Shop.findById.mockResolvedValue({ owner: "owner-1" });
    User.findById.mockResolvedValue(null);

    const json = jest.fn();
    const req = {
      params: { shopId: "shop-1", userId: "user-9" },
      user: { _id: "owner-1" },
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.blockCustomer(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
  });

  it("should prefer resolved tenant shop when blocking customer", async () => {
    Shop.findById.mockResolvedValue({ owner: "owner-1" });
    User.findById.mockResolvedValue({ _id: "user-9", save: jest.fn() });

    const req = {
      shop: { _id: "shop-from-tenant" },
      params: { shopId: "shop-from-param", userId: "user-9" },
      user: { _id: "owner-1" },
    };
    const res = {
      json: jest.fn(),
      status: jest.fn(() => ({ json: jest.fn() })),
    };

    await controller.blockCustomer(req, res);

    expect(Shop.findById).toHaveBeenCalledWith("shop-from-tenant");
  });
});
