jest.mock("../services/wallet.service", () => ({
  creditWallet: jest.fn(),
  debitWallet: jest.fn(),
}));

jest.mock("../models/settlement.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../services/payout.service", () => ({
  processPayout: jest.fn(),
}));

jest.mock("@/inventory", () => ({
  createInventoryEntry: jest.fn(),
}));

const walletService = require("../services/wallet.service");
const walletController = require("../controllers/shop/wallet.controller");
const Settlement = require("../models/settlement.model");
const settlementController = require("../controllers/settlement.controller");
const inventory = require("@/inventory");
const inventoryController = require("../controllers/inventory.controller");

describe("legacy response contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should include success flag in wallet topup response", async () => {
    walletService.creditWallet.mockResolvedValue({ balance: 100 });
    const res = { json: jest.fn() };

    await walletController.topupWallet(
      { user: { _id: "shop-1" }, body: { amount: 20 }, lang: "en" },
      res,
      jest.fn()
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: expect.any(String),
      data: { balance: 100 },
    });
  });

  it("should include success flag in inventory adjust response", async () => {
    inventory.createInventoryEntry.mockResolvedValue({ _id: "ledger-1" });
    const res = { json: jest.fn() };

    await inventoryController.adjustStock(
      {
        shop: { _id: "shop-1" },
        user: { _id: "user-1" },
        body: { product: "prod-1", quantity: 2, note: "fix" },
        lang: "en",
      },
      res,
      jest.fn()
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: expect.any(String),
      ledger: { _id: "ledger-1" },
    });
  });

  it("should include message alongside error for missing settlement payout", async () => {
    Settlement.findById.mockResolvedValue(null);
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) };

    await settlementController.payoutSettlement(
      { params: { settlementId: "set-1" } },
      res
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Settlement not found",
      message: "Settlement not found",
    });
  });
});
