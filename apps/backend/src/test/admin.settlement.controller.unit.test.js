jest.mock("../models/settlement.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../services/payout.service", () => ({
  triggerPayout: jest.fn(),
}));

jest.mock("@/core/infrastructure", () => ({
  addJob: jest.fn(),
}));

const Settlement = require("../models/settlement.model");
const { triggerPayout } = require("../services/payout.service");
const { addJob } = require("@/core/infrastructure");
const controller = require("../controllers/admin/settlement.controller");

describe("admin settlement controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should trigger payout using settlement context", async () => {
    Settlement.findById.mockResolvedValue({
      _id: "set-1",
      shopId: "shop-1",
      payoutRef: "",
    });

    const res = {
      json: jest.fn(),
      status: jest.fn(() => ({ json: jest.fn() })),
    };

    await controller.triggerManualPayout(
      { params: { settlementId: "set-1" } },
      res
    );

    expect(addJob).toHaveBeenCalledWith("settlement", { settlementId: "set-1" });
    expect(triggerPayout).toHaveBeenCalledWith({ settlementId: "set-1" });
    expect(res.json).toHaveBeenCalledWith({ message: "Payout triggered" });
  });

  it("should block already paid settlements", async () => {
    Settlement.findById.mockResolvedValue({
      _id: "set-1",
      shopId: "shop-1",
      payoutRef: "PAY-1",
    });

    const json = jest.fn();
    const res = {
      json: jest.fn(),
      status: jest.fn(() => ({ json })),
    };

    await controller.triggerManualPayout(
      { params: { settlementId: "set-1" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: "Already paid out" });
    expect(triggerPayout).not.toHaveBeenCalled();
  });
});
