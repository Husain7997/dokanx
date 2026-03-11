jest.mock("../models/shop.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../platform/config/platformConfig.service", () => ({
  getConfig: jest.fn(),
}));

const Shop = require("../models/shop.model");
const { getConfig } = require("../platform/config/platformConfig.service");
const domainService = require("../services/domain.service");

describe("domain.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    domainService.clearDomainCache();
    getConfig.mockResolvedValue("dokanx.com");
  });

  it("should resolve a shop by custom domain", async () => {
    Shop.findOne.mockReturnValueOnce({
      select: () => ({
        lean: async () => ({ _id: "shop-1", domain: "store.example.com" }),
      }),
    });

    const shop = await domainService.resolveShopByHost({
      host: "store.example.com",
    });

    expect(shop._id).toBe("shop-1");
    expect(Shop.findOne).toHaveBeenCalledWith({
      $or: [
        { domain: "store.example.com" },
        { "customDomains.domain": "store.example.com" },
      ],
      isActive: true,
      status: "ACTIVE",
    });
  });

  it("should resolve a shop by subdomain when exact domain is missing", async () => {
    Shop.findOne
      .mockReturnValueOnce({
        select: () => ({
          lean: async () => null,
        }),
      })
      .mockReturnValueOnce({
        select: () => ({
          lean: async () => ({ _id: "shop-2", subdomain: "alpha" }),
        }),
      });

    const shop = await domainService.resolveShopByHost({
      host: "alpha.dokanx.com",
    });

    expect(shop._id).toBe("shop-2");
    expect(Shop.findOne).toHaveBeenLastCalledWith({
      subdomain: "alpha",
      isActive: true,
      status: "ACTIVE",
    });
  });

  it("should ignore localhost hosts", async () => {
    const shop = await domainService.resolveShopByHost({
      host: "localhost:5173",
    });

    expect(shop).toBeNull();
    expect(Shop.findOne).not.toHaveBeenCalled();
  });
});
