jest.mock("../services/panicMode.service", () => ({
  getPanicModeState: jest.fn(),
}));

const { getPanicModeState } = require("../services/panicMode.service");
const { enforcePanicMode } = require("../middlewares/panicMode.middleware");

describe("panicMode.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow read methods even when panic mode is enabled", async () => {
    getPanicModeState.mockResolvedValue({
      enabled: true,
      reason: "incident",
    });

    const req = { method: "GET", path: "/api/orders" };
    const res = {};
    const next = jest.fn();

    await enforcePanicMode(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(getPanicModeState).not.toHaveBeenCalled();
  });

  it("should block writes when panic mode is enabled", async () => {
    getPanicModeState.mockResolvedValue({
      enabled: true,
      reason: "incident",
      updatedAt: "2026-03-11T00:00:00.000Z",
    });

    const req = { method: "POST", path: "/api/orders" };
    const status = jest.fn(() => ({ json: jest.fn() }));
    const res = { status };
    const next = jest.fn();

    await enforcePanicMode(req, res, next);

    expect(status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow panic mode control route", async () => {
    getPanicModeState.mockResolvedValue({
      enabled: true,
      reason: "incident",
    });

    const req = { method: "PUT", path: "/api/admin/system/panic-mode" };
    const res = {};
    const next = jest.fn();

    await enforcePanicMode(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(getPanicModeState).not.toHaveBeenCalled();
  });
});
