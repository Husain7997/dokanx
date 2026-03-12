jest.mock("../models/shop.model", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../services/domain.service", () => ({
  normalizeHost: jest.fn((value) => String(value || "").split(":")[0]),
  resolveShopByHost: jest.fn(),
}));

const Shop = require("../models/shop.model");
const domainService = require("../services/domain.service");
const middleware = require("../middlewares/tenantResolution.middleware");

describe("tenantResolution.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should resolve tenant from x-tenant-id before host lookup", async () => {
    Shop.findById.mockReturnValue({
      select: () => ({
        lean: async () => ({ _id: "shop-1", subdomain: "alpha" }),
      }),
    });

    const req = {
      headers: {
        "x-tenant-id": "shop-1",
        host: "localhost:3000",
      },
    };

    await middleware.resolveTenant(req, {}, jest.fn());

    expect(req.tenant).toBe("shop-1");
    expect(req.shop).toEqual({ _id: "shop-1", subdomain: "alpha" });
    expect(domainService.resolveShopByHost).not.toHaveBeenCalled();
  });

  it("should resolve tenant from x-tenant-slug before host lookup", async () => {
    Shop.findById.mockReturnValue({
      select: () => ({
        lean: async () => null,
      }),
    });
    Shop.findOne.mockReturnValue({
      select: () => ({
        lean: async () => ({ _id: "shop-2", subdomain: "beta" }),
      }),
    });

    const req = {
      headers: {
        "x-tenant-slug": "beta",
        host: "localhost:3000",
      },
    };

    await middleware.resolveTenant(req, {}, jest.fn());

    expect(req.tenant).toBe("shop-2");
    expect(req.shop).toEqual({ _id: "shop-2", subdomain: "beta" });
    expect(domainService.resolveShopByHost).not.toHaveBeenCalled();
  });
});
