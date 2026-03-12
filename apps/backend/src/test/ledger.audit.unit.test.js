jest.mock("../models/wallet.model", () => ({
  find: jest.fn(),
}));

jest.mock("../modules/ledger/ledger.model", () => ({
  find: jest.fn(),
}));

const Wallet = require("../models/wallet.model");
const Ledger = require("../modules/ledger/ledger.model");
const audit = require("../core/selfheal/ledger.audit");

describe("ledger.audit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not flag a wallet when ledger delta matches wallet balance", async () => {
    Wallet.find.mockResolvedValue([
      { shopId: "shop-1", balance: 100 },
    ]);

    Ledger.find.mockReturnValue({
      select: () => ({
        lean: async () => ([
          { amount: 100, type: "debit", meta: { reason: "wallet_credit" } },
          { amount: 100, type: "credit", meta: { reason: "wallet_credit" } },
        ]),
      }),
    });

    const issues = await audit.findInconsistencies();

    expect(issues).toEqual([]);
  });

  it("should flag a wallet when signed ledger delta differs from balance", async () => {
    Wallet.find.mockResolvedValue([
      { shopId: "shop-2", balance: 20 },
    ]);

    Ledger.find.mockReturnValue({
      select: () => ({
        lean: async () => ([
          { amount: 50, type: "debit", meta: { reason: "wallet_debit" } },
          { amount: 50, type: "credit", meta: { reason: "wallet_debit" } },
        ]),
      }),
    });

    const issues = await audit.findInconsistencies();

    expect(issues).toEqual([
      { shopId: "shop-2", diff: -70 },
    ]);
  });
});
