const request = require("supertest");
const express = require("express");

jest.mock("../middlewares", () => ({
  protect: (_req, _res, next) => next(),
}));

jest.mock("../middlewares/role.middleware", () => () => (_req, _res, next) => next());
jest.mock("../middlewares/checkShopOwnership", () => (_req, _res, next) => next());
jest.mock("@/api/middleware/tenantGuard", () => ({
  tenantGuard: (_req, _res, next) => next(),
}));
jest.mock("@/platform/rate-limit/redisRateLimiter", () => ({
  redisRateLimiter: () => (_req, _res, next) => next(),
}));

jest.mock("../controllers/product.controller", () => ({
  smartSuggest: jest.fn((req, res) => res.json({ ok: true })),
  createProduct: jest.fn((req, res) => res.json({ ok: true })),
  updateProduct: jest.fn((req, res) => res.json({ ok: true })),
  deleteProduct: jest.fn((req, res) => res.json({ ok: true })),
  getProductsByShop: jest.fn((req, res) => res.json({ ok: true })),
  getProductInventory: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../controllers/checkout.controller", () => ({
  checkout: jest.fn((req, res) => res.json({ ok: true })),
}));

const productController = require("../controllers/product.controller");
const checkoutController = require("../controllers/checkout.controller");
const productRoutes = require("../routes/product.routes");
const checkoutRoutes = require("../routes/checkout.routes");

function buildApp(path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

describe("product and checkout route validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject invalid smart-suggest payload", async () => {
    const app = buildApp("/products", productRoutes);
    const res = await request(app).post("/products/smart-suggest").send({ limit: 0 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("name or barcode is required");
    expect(res.body.errors).toContain("limit must be >= 1");
    expect(productController.smartSuggest).not.toHaveBeenCalled();
  });

  it("should reject invalid product create payload", async () => {
    const app = buildApp("/products", productRoutes);
    const res = await request(app).post("/products").send({ name: "", price: -1, stock: -1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("name is required");
    expect(res.body.errors).toContain("price must be >= 0");
    expect(res.body.errors).toContain("stock must be >= 0");
    expect(productController.createProduct).not.toHaveBeenCalled();
  });

  it("should reject invalid checkout payload", async () => {
    const app = buildApp("/checkout", checkoutRoutes);
    const res = await request(app).post("/checkout").send({ items: [], totalAmount: -5 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("items must be a non-empty array");
    expect(res.body.errors).toContain("totalAmount must be >= 0");
    expect(checkoutController.checkout).not.toHaveBeenCalled();
  });

  it("should reject invalid product update payload", async () => {
    const app = buildApp("/products", productRoutes);
    const res = await request(app).patch("/products/prod-1").send({ price: -1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("price must be >= 0");
    expect(productController.updateProduct).not.toHaveBeenCalled();
  });
});
