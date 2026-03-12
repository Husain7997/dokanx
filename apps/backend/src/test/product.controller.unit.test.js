jest.mock("../models/product.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../models/Inventory.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../utils/audit.util", () => ({
  createAudit: jest.fn(),
}));

jest.mock("../modules/catalog/catalog.service", () => ({
  findSuggestions: jest.fn(),
  applyDecision: jest.fn(),
}));

const Product = require("../models/product.model");
const Inventory = require("../models/Inventory.model");
const catalogService = require("../modules/catalog/catalog.service");
const controller = require("../controllers/product.controller");

describe("product.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 500 when smart suggest fails", async () => {
    catalogService.findSuggestions.mockRejectedValue(new Error("catalog failed"));
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.smartSuggest(
      { body: { name: "Demo" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Smart suggestion failed",
    });
  });

  it("should return 404 when creating product without shop context", async () => {
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.createProduct(
      {
        shop: null,
        body: { name: "Demo Product" },
        user: { _id: "user-1" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Shop not found",
    });
  });

  it("should reject duplicate product in same shop", async () => {
    Product.findOne.mockReturnValue({
      lean: async () => ({ _id: "prod-1" }),
    });
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.createProduct(
      {
        shop: { _id: "shop-1" },
        user: { _id: "user-1" },
        body: { name: "Demo Product", price: 100, stock: 2 },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Product already exists in this shop",
    });
  });

  it("should return inventory not found response with success false", async () => {
    Inventory.findOne.mockResolvedValue(null);
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.getProductInventory(
      {
        shop: { _id: "shop-1" },
        params: { productId: "prod-1" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Inventory not found",
    });
  });

  it("should return inventory payload with success true", async () => {
    Inventory.findOne.mockResolvedValue({
      stock: 10,
      reserved: 2,
    });
    const res = {
      json: jest.fn(),
    };

    await controller.getProductInventory(
      {
        shop: { _id: "shop-1" },
        params: { productId: "prod-1" },
      },
      res
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      available: 10,
      reserved: 2,
    });
  });

  it("should update a product and sync inventory stock", async () => {
    const save = jest.fn();
    Product.findOne.mockResolvedValue({
      _id: "prod-1",
      shopId: "shop-1",
      name: "Old Name",
      stock: 3,
      save,
    });
    const res = {
      json: jest.fn(),
    };

    await controller.updateProduct(
      {
        shop: { _id: "shop-1" },
        user: { _id: "user-1" },
        params: { productId: "prod-1" },
        body: { name: "New Name", stock: 9 },
      },
      res
    );

    expect(save).toHaveBeenCalled();
    expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
      {
        shopId: "shop-1",
        product: "prod-1",
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          stock: 9,
          isActive: true,
        }),
      }),
      expect.objectContaining({
        upsert: true,
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        _id: "prod-1",
        name: "New Name",
        stock: 9,
      }),
    });
  });

  it("should archive a product instead of hard deleting it", async () => {
    const save = jest.fn();
    Product.findOne.mockResolvedValue({
      _id: "prod-2",
      shopId: "shop-1",
      isActive: true,
      save,
    });
    const res = {
      json: jest.fn(),
    };

    await controller.deleteProduct(
      {
        shop: { _id: "shop-1" },
        user: { _id: "user-1" },
        params: { productId: "prod-2" },
      },
      res
    );

    expect(save).toHaveBeenCalled();
    expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
      {
        shopId: "shop-1",
        product: "prod-2",
      },
      {
        $set: {
          isActive: false,
        },
      }
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Product archived",
      data: {
        _id: "prod-2",
        isActive: false,
      },
    });
  });

  it("should list public products", async () => {
    Product.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [{ _id: "prod-3", name: "Public Product" }],
        }),
      }),
    });

    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.listProducts(
      {
        query: {},
        lang: "en",
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        data: [{ _id: "prod-3", name: "Public Product" }],
      })
    );
  });
});
