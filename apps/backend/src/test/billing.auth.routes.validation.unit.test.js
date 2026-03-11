const request = require("supertest");
const express = require("express");

jest.mock("@/middlewares", () => ({
  protect: (req, _res, next) => next(),
  allowRoles: () => (_req, _res, next) => next(),
}));

jest.mock("@/platform/rate-limit/redisRateLimiter", () => ({
  redisRateLimiter: () => (_req, _res, next) => next(),
}));

jest.mock("passport", () => ({
  authenticate: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock("../modules/auth/googleAuth", () => ({}));

jest.mock("../modules/billing/billing.controller", () => ({
  listPlans: jest.fn((req, res) => res.json({ ok: true })),
  createPlan: jest.fn((req, res) => res.json({ ok: true })),
  updatePlan: jest.fn((req, res) => res.json({ ok: true })),
  deletePlan: jest.fn((req, res) => res.json({ ok: true })),
  listSubscriptions: jest.fn((req, res) => res.json({ ok: true })),
  assignSubscription: jest.fn((req, res) => res.json({ ok: true })),
  listCommissionRules: jest.fn((req, res) => res.json({ ok: true })),
  createCommissionRule: jest.fn((req, res) => res.json({ ok: true })),
  updateCommissionRule: jest.fn((req, res) => res.json({ ok: true })),
  deleteCommissionRule: jest.fn((req, res) => res.json({ ok: true })),
  listPaymentRoutingRules: jest.fn((req, res) => res.json({ ok: true })),
  createPaymentRoutingRule: jest.fn((req, res) => res.json({ ok: true })),
  updatePaymentRoutingRule: jest.fn((req, res) => res.json({ ok: true })),
  deletePaymentRoutingRule: jest.fn((req, res) => res.json({ ok: true })),
  listSmsPacks: jest.fn((req, res) => res.json({ ok: true })),
  createSmsPack: jest.fn((req, res) => res.json({ ok: true })),
  updateSmsPack: jest.fn((req, res) => res.json({ ok: true })),
  deleteSmsPack: jest.fn((req, res) => res.json({ ok: true })),
  previewCommission: jest.fn((req, res) => res.json({ ok: true })),
  previewPaymentRouting: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../modules/auth/auth.controller", () => ({
  register: jest.fn((req, res) => res.json({ ok: true })),
  login: jest.fn((req, res) => res.json({ ok: true })),
  requestOtp: jest.fn((req, res) => res.json({ ok: true })),
  verifyOtp: jest.fn((req, res) => res.json({ ok: true })),
  requestMagicLink: jest.fn((req, res) => res.json({ ok: true })),
  verifyMagicLink: jest.fn((req, res) => res.json({ ok: true })),
  refresh: jest.fn((req, res) => res.json({ ok: true })),
  logout: jest.fn((req, res) => res.json({ ok: true })),
  logoutAll: jest.fn((req, res) => res.json({ ok: true })),
  listSessions: jest.fn((req, res) => res.json({ ok: true })),
  revokeSession: jest.fn((req, res) => res.json({ ok: true })),
}));

const billingController = require("../modules/billing/billing.controller");
const authController = require("../modules/auth/auth.controller");
const billingRoutes = require("../modules/billing/billing.routes");
const authRoutes = require("../modules/auth/auth.routes");

function buildApp(path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

describe("billing/auth route validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject invalid billing plan body before controller", async () => {
    const app = buildApp("/billing", billingRoutes);

    const res = await request(app)
      .post("/billing/plans")
      .send({ name: "", commissionRate: 101 });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Validation failed");
    expect(res.body.errors).toContain("name is required");
    expect(billingController.createPlan).not.toHaveBeenCalled();
  });

  it("should reject invalid billing subscription assignment before controller", async () => {
    const app = buildApp("/billing", billingRoutes);

    const res = await request(app)
      .post("/billing/subscriptions/assign")
      .send({ tenantId: "", planId: "" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("tenantId is required");
    expect(billingController.assignSubscription).not.toHaveBeenCalled();
  });

  it("should reject invalid billing preview routing body before controller", async () => {
    const app = buildApp("/billing", billingRoutes);

    const res = await request(app)
      .post("/billing/preview/payment-routing")
      .send({ tenantId: "", amount: -1, hasOwnGateway: "yes" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("tenantId is required");
    expect(res.body.errors).toContain("amount must be >= 0");
    expect(res.body.errors).toContain("hasOwnGateway must be boolean");
    expect(billingController.previewPaymentRouting).not.toHaveBeenCalled();
  });

  it("should reject invalid auth register body before controller", async () => {
    const app = buildApp("/auth", authRoutes);

    const res = await request(app)
      .post("/auth/register")
      .send({ name: "", email: "bad", password: "123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("name is required");
    expect(res.body.errors).toContain("email is required");
    expect(res.body.errors).toContain("password must be at least 6 characters");
    expect(authController.register).not.toHaveBeenCalled();
  });

  it("should reject invalid auth login body before controller", async () => {
    const app = buildApp("/auth", authRoutes);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "", password: "" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("email is required");
    expect(res.body.errors).toContain("password is required");
    expect(authController.login).not.toHaveBeenCalled();
  });

  it("should reject invalid auth refresh body before controller", async () => {
    const app = buildApp("/auth", authRoutes);

    const res = await request(app)
      .post("/auth/refresh")
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("refreshToken is required");
    expect(authController.refresh).not.toHaveBeenCalled();
  });

  it("should reject invalid auth otp request body before controller", async () => {
    const app = buildApp("/auth", authRoutes);

    const res = await request(app)
      .post("/auth/otp/request")
      .send({ phone: "1234" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("phone must be a valid Bangladesh number");
    expect(authController.requestOtp).not.toHaveBeenCalled();
  });
});
