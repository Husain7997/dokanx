const {
  calculateEntryDelta,
  calculateLedgerDelta,
} = require("@/core/financial/ledger.delta");

describe("ledger.delta", () => {
  it("should count wallet credit only from the credit leg", () => {
    const entries = [
      { amount: 120, type: "debit", meta: { reason: "wallet_credit" } },
      { amount: 120, type: "credit", meta: { reason: "wallet_credit" } },
    ];

    expect(calculateLedgerDelta(entries)).toBe(120);
  });

  it("should count wallet debit only from the debit leg", () => {
    const entries = [
      { amount: 80, type: "debit", meta: { reason: "wallet_debit" } },
      { amount: 80, type: "credit", meta: { reason: "wallet_debit" } },
    ];

    expect(calculateLedgerDelta(entries)).toBe(-80);
  });

  it("should fall back to signed credit-debit math for generic entries", () => {
    expect(
      calculateEntryDelta({ amount: 50, type: "credit", meta: {} })
    ).toBe(50);

    expect(
      calculateEntryDelta({ amount: 50, type: "debit", meta: {} })
    ).toBe(-50);
  });
});
