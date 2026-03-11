const middleware = require("../middlewares/checkShopOwnership");

describe("checkShopOwnership middleware", () => {
  it("should allow when shop owner matches authenticated user", async () => {
    const req = {
      shop: { _id: "shop-1", owner: "user-1", isActive: true, status: "ACTIVE" },
      user: { _id: "user-1" },
    };
    const res = {
      status: jest.fn(() => ({ json: jest.fn() })),
    };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should reject suspended shops", async () => {
    const json = jest.fn();
    const req = {
      shop: { _id: "shop-1", owner: "user-1", isActive: false, status: "SUSPENDED" },
      user: { _id: "user-1" },
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Shop is suspended",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
