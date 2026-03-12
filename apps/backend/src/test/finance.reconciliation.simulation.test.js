jest.mock("../models/ReconciliationReport", () => ({
  findOneAndUpdate: jest.fn(async (_query, update) => update.$set),
}));

jest.mock("../models/FinanceException", () => ({
  findOneAndUpdate: jest.fn(async (_query, update) => ({
    ...update.$set,
    timeline: update.$setOnInsert?.timeline || [],
  })),
  updateMany: jest.fn(async () => ({ acknowledged: true })),
  find: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../models/payout.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../models/PayoutRetry", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

const ReconciliationReport = require("../models/ReconciliationReport");
const FinanceException = require("../models/FinanceException");
const Payout = require("../models/payout.model");
const PayoutRetry = require("../models/PayoutRetry");
const service = require("../services/financeAssurance.service");

describe("finance assurance simulations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("detects settlement drift", async () => {
    const result = await service.verifyReconciliation({
      date: "2026-03-12",
      dependencies: {
        ledgerEntries: [],
        wallets: [],
        payoutRetries: [],
        settlements: [
          {
            _id: "set-1",
            shopId: "shop-1",
            totalAmount: 1000,
            commission: 50,
            taxAmount: 0,
            netAmount: 900,
          },
        ],
      },
    });

    expect(result.summary.settlementAnomalyCount).toBe(1);
    expect(ReconciliationReport.findOneAndUpdate).toHaveBeenCalled();
    expect(FinanceException.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SETTLEMENT_DRIFT" }),
      expect.any(Object),
      expect.any(Object)
    );
  });

  it("recovers payout retry successfully", async () => {
    const payoutSave = jest.fn();
    const retrySave = jest.fn();
    Payout.findById.mockResolvedValue({
      _id: "payout-1",
      shopId: "shop-1",
      status: "FAILED",
      save: payoutSave,
    });
    PayoutRetry.findOne.mockResolvedValue({
      payoutId: "payout-1",
      attempts: 2,
      status: "FAILED",
      save: retrySave,
    });

    const result = await service.recoverFailedPayout({
      payoutId: "payout-1",
      gatewayExecutor: jest.fn(async () => true),
    });

    expect(result.recovered).toBe(true);
    expect(payoutSave).toHaveBeenCalled();
    expect(retrySave).toHaveBeenCalledTimes(2);
    expect(FinanceException.updateMany).toHaveBeenCalled();
  });

  it("flags double ledger protection risk", async () => {
    const result = await service.verifyReconciliation({
      dependencies: {
        wallets: [{ shopId: "shop-1", balance: 100 }],
        ledgerEntries: [
          { shopId: "shop-1", amount: 100, type: "CREDIT", referenceId: "ord-1" },
          { shopId: "shop-1", amount: 100, type: "CREDIT", referenceId: "ord-1" },
        ],
        settlements: [],
        payoutRetries: [],
      },
    });

    expect(result.summary.doubleLedgerRiskCount).toBe(1);
    expect(FinanceException.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "DOUBLE_LEDGER_RISK" }),
      expect.any(Object),
      expect.any(Object)
    );
  });

  it("flags idempotency replay risk", async () => {
    const result = await service.verifyReconciliation({
      thresholds: { idempotencyReplayCount: 1 },
      dependencies: {
        wallets: [],
        settlements: [],
        payoutRetries: [],
        ledgerEntries: [
          { shopId: "shop-1", amount: 100, type: "CREDIT", referenceId: "idem-1" },
          { shopId: "shop-1", amount: 50, type: "DEBIT", referenceId: "idem-1" },
        ],
      },
    });

    expect(result.summary.idempotencyReplayCount).toBe(1);
    expect(FinanceException.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "IDEMPOTENCY_REPLAY" }),
      expect.any(Object),
      expect.any(Object)
    );
  });
});
