jest.mock("axios", () => ({
  post: jest.fn(),
}));

jest.mock("../modules/ledger/ledger.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../services/wallet/walletAdapter.service", () => ({
  findById: jest.fn(),
}));

jest.unmock("../infrastructure/payment/payoutGateway.service");

const Ledger = require("../modules/ledger/ledger.model");
const walletAdapter = require("../services/wallet/walletAdapter.service");
const { triggerPayout } = require("../infrastructure/payment/payoutGateway.service");

describe("payoutGateway.service triggerPayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the existing ledger entry for duplicate payout requests", async () => {
    const existing = { _id: "ledger-1", meta: { referenceId: "ref-1", idempotencyKey: "idem-1" } };
    Ledger.findOne.mockResolvedValue(existing);

    const result = await triggerPayout({
      walletId: "wallet-1",
      amount: 500,
      type: "BKASH",
      referenceId: "ref-1",
      idempotencyKey: "idem-1",
    });

    expect(Ledger.findOne).toHaveBeenCalledWith({
      meta: { referenceId: "ref-1", idempotencyKey: "idem-1" },
    });
    expect(walletAdapter.findById).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });

  it("creates a success ledger entry for a supported payout type", async () => {
    const wallet = { _id: "wallet-2", bkashNumber: "01700000000" };
    const created = { _id: "ledger-2" };

    Ledger.findOne.mockResolvedValue(null);
    walletAdapter.findById.mockResolvedValue(wallet);
    Ledger.create.mockResolvedValue(created);

    const result = await triggerPayout({
      walletId: "wallet-2",
      amount: 900,
      type: "BKASH",
      referenceId: "ref-2",
      idempotencyKey: "idem-2",
    });

    expect(walletAdapter.findById).toHaveBeenCalledWith("wallet-2");
    expect(Ledger.create).toHaveBeenCalledWith({
      walletId: "wallet-2",
      type: "PAYOUT",
      direction: "DEBIT",
      amount: 900,
      meta: {
        referenceId: "ref-2",
        idempotencyKey: "idem-2",
        provider: "BKASH",
        status: "SUCCESS",
      },
    });
    expect(result).toBe(created);
  });

  it("throws when the wallet cannot be found", async () => {
    Ledger.findOne.mockResolvedValue(null);
    walletAdapter.findById.mockResolvedValue(null);

    await expect(
      triggerPayout({
        walletId: "missing-wallet",
        amount: 200,
        type: "BANK",
        referenceId: "ref-3",
        idempotencyKey: "idem-3",
      })
    ).rejects.toThrow("Wallet not found");
  });
});
