jest.mock("../models/payout.model", () => ({
  findOneAndUpdate: jest.fn(),
}));

jest.mock("@/core/financial", () => ({
  FinancialEngine: {
    execute: jest.fn(),
  },
  FinancialTypes: {},
}));

jest.mock("@/infrastructure/events/eventBus", () => ({
  emit: jest.fn(),
}));

const Payout = require("../models/payout.model");
const { FinancialEngine } = require("@/core/financial");
const eventBus = require("@/infrastructure/events/eventBus");
const { processPayout } = require("../services/payout.service");

describe("payout.service processPayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks a pending payout successful and emits completion", async () => {
    const payout = {
      _id: "payout-1",
      shopId: "shop-1",
      amount: 1250,
      reference: "REF-1",
      status: "PROCESSING",
      save: jest.fn().mockResolvedValue(true),
    };

    Payout.findOneAndUpdate.mockResolvedValue(payout);
    FinancialEngine.execute.mockResolvedValue(undefined);

    const result = await processPayout({ shopId: "shop-1" });

    expect(Payout.findOneAndUpdate).toHaveBeenCalledWith(
      {
        shopId: "shop-1",
        status: { $ne: "SUCCESS" },
      },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          amount: 0,
          type: "AUTO",
          requestedBy: "shop-1",
          status: "PROCESSING",
        }),
      }),
      { upsert: true, returnDocument: "after" }
    );
    expect(FinancialEngine.execute).toHaveBeenCalledWith({
      shopId: "shop-1",
      amount: -1250,
      type: "PAYOUT",
      referenceId: "REF-1",
      meta: { payoutId: "payout-1" },
    });
    expect(payout.status).toBe("SUCCESS");
    expect(payout.processedAt).toBeInstanceOf(Date);
    expect(payout.save).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith("PAYOUT_COMPLETED", {
      payoutId: "payout-1",
      shopId: "shop-1",
      amount: 1250,
    });
    expect(result).toBe(payout);
  });

  it("returns an already successful payout without reprocessing", async () => {
    const payout = {
      _id: "payout-2",
      shopId: "shop-2",
      amount: 800,
      reference: "REF-2",
      status: "SUCCESS",
      save: jest.fn(),
    };

    Payout.findOneAndUpdate.mockResolvedValue(payout);

    const result = await processPayout({ shopId: "shop-2" });

    expect(FinancialEngine.execute).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
    expect(payout.save).not.toHaveBeenCalled();
    expect(result).toBe(payout);
  });
});

