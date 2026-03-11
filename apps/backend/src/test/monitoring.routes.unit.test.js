jest.mock("../platform/observability/systemHealth.service", () => ({
  getSystemHealth: jest.fn(async () => ({ status: "OK" })),
  getSystemMetrics: jest.fn(async () => ({ requests: 10 })),
  getQueueDeadLetterMetrics: jest.fn(async () => ({ queues: [] })),
}));

const controller = require("../infrastructure/monitoring/health.controller");

describe("monitoring controller contract", () => {
  it("should return health payload through controller", async () => {
    const res = { json: jest.fn() };
    const next = jest.fn();

    await controller.health({}, res, next);

    expect(res.json).toHaveBeenCalledWith({ status: "OK" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return metrics payload through controller", async () => {
    const req = { query: { tenantId: "shop-1", minutes: 30 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await controller.metrics(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ requests: 10 });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return dead-letter payload through controller", async () => {
    const req = { query: { sampleSize: 5 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await controller.deadLetter(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ queues: [] });
    expect(next).not.toHaveBeenCalled();
  });
});
