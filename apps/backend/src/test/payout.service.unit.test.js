jest.mock("../models/payout.model", () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../models/settlement.model", () => ({
  findById: jest.fn(),
  updateOne: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("@/services/financialCommand.service", () => ({
  executeFinancial: jest.fn(),
}));

jest.mock("@/core/infrastructure", () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

const Payout = require("../models/payout.model");
const Settlement = require("../models/settlement.model");
const { executeFinancial } = require("@/services/financialCommand.service");
const { eventBus } = require("@/core/infrastructure");
const service = require("../services/payout.service");

describe("payout.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject payout with non-positive amount", async () => {
    Payout.findOne.mockResolvedValue({
      _id: "pay-1",
      shopId: "shop-1",
      amount: 0,
      status: "PENDING",
      save: jest.fn(),
    });

    await expect(service.processPayout({ shopId: "shop-1" })).rejects.toThrow(
      "Payout amount must be greater than 0"
    );
    expect(executeFinancial).not.toHaveBeenCalled();
  });

  it("should execute payout and mark settlement reference", async () => {
    const save = jest.fn();
    Payout.findOne.mockResolvedValue({
      _id: "pay-1",
      shopId: "shop-1",
      amount: 250,
      status: "PENDING",
      reference: "PAY-REF-1",
      idempotencyKey: "idem-1",
      save,
    });

    const row = await service.processPayout({
      shopId: "shop-1",
      settlementId: "set-1",
    });

    expect(executeFinancial).toHaveBeenCalledWith({
      shopId: "shop-1",
      amount: 250,
      idempotencyKey: "idem-1",
      reason: "wallet_debit",
    });
    expect(Settlement.updateOne).toHaveBeenCalledWith(
      { _id: "set-1", shopId: "shop-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          payoutRef: "PAY-REF-1",
          status: "COMPLETED",
        }),
      })
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      "PAYOUT_COMPLETED",
      expect.objectContaining({ payoutId: "pay-1", shopId: "shop-1", amount: 250 })
    );
    expect(row.status).toBe("SUCCESS");
  });
});
