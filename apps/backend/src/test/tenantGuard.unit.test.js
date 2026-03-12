const { tenantGuard } = require("../api/middleware/tenantGuard");

describe("tenantGuard", () => {
  it("should reject mismatched shopId in request payload", () => {
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    tenantGuard(
      {
        user: { shopId: "shop-1" },
        body: { shopId: "shop-2" },
      },
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: "Tenant mismatch" });
  });

  it("should attach shop from authenticated tenant when missing", () => {
    const next = jest.fn();
    const req = {
      user: { shopId: "shop-1" },
      body: {},
      params: {},
      query: {},
    };

    tenantGuard(req, { status: jest.fn(() => ({ json: jest.fn() })) }, next);

    expect(req.shop).toEqual({ _id: "shop-1" });
    expect(next).toHaveBeenCalled();
  });
});
