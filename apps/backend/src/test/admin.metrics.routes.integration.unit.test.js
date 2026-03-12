const request = require("supertest");
const express = require("express");

jest.mock("@/middlewares", () => ({
  protect: (req, _res, next) => {
    req.user = { _id: "admin-1", role: "admin" };
    next();
  },
  allowRoles: () => (_req, _res, next) => next(),
}));

jest.mock("../models/shop.model", () => ({
  countDocuments: jest.fn().mockResolvedValue(2),
}));

jest.mock("../models/order.model", () => ({
  countDocuments: jest.fn().mockResolvedValue(3),
}));

jest.mock("../models/wallet.model", () => ({
  find: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock("../models/settlement.model", () => ({
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
  }),
}));

jest.mock("../modules/ledger/ledger.model", () => ({
  countDocuments: jest.fn().mockResolvedValue(0),
}));

jest.mock("../modules/automation/automation.service", () => ({
  getDashboard: jest.fn().mockResolvedValue({ recentTasks: [] }),
}));

jest.mock("../modules/app-marketplace/webhookDelivery.service", () => ({
  listDeadLetters: jest.fn().mockResolvedValue([]),
}));

jest.mock("../modules/courier/courier.service", () => ({
  getCourierDashboard: jest.fn().mockResolvedValue({ statusBreakdown: [] }),
  listCourierAnomalies: jest.fn().mockResolvedValue([]),
}));

const routes = require("../routes/admin.metrics.routes");

describe("admin metrics routes integration", () => {
  it("should serve consolidated operations metrics through real controller", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", routes);
    const res = await request(app).get("/metrics/operations?shopId=shop-1");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty("finance");
    expect(res.body.data).toHaveProperty("courier");
  });
});
