jest.mock("../services/wallet.service", () => ({
  creditWallet: jest.fn(),
  debitWallet: jest.fn(),
}));

jest.mock("../models/settlement.model", () => ({
  findById: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../models/shop.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../models/ShopWallet", () => ({
  findOne: jest.fn(),
}));

jest.mock("../services/settlement.service", () => ({
  processSettlement: jest.fn(),
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
const Shop = require("../models/shop.model");
const ShopWallet = require("../models/ShopWallet");
const { processSettlement } = require("../services/settlement.service");
const { processPayout } = require("../services/payout.service");
const settlementController = require("../controllers/settlement.controller");
const inventory = require("@/inventory");
const inventoryController = require("../controllers/inventory.controller");

describe("legacy controllers edge cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return translated topup response", async () => {
    walletService.creditWallet.mockResolvedValue({ balance: 50 });
    const res = { json: jest.fn() };

    await walletController.topupWallet(
      { user: { _id: "shop-1" }, body: { amount: 10 }, lang: "en" },
      res,
      jest.fn()
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: expect.any(String),
      data: { balance: 50 },
    }));
  });

  it("should call next when wallet transfer fails", async () => {
    const next = jest.fn();
    walletService.debitWallet.mockRejectedValue(new Error("debit failed"));

    await walletController.transferWallet(
      { user: { _id: "shop-1" }, body: { toShopId: "shop-2", amount: 10 }, lang: "en" },
      { json: jest.fn() },
      next
    );

    expect(next).toHaveBeenCalled();
  });

  it("should return 404 when settlement shop is missing", async () => {
    Shop.findById.mockResolvedValue(null);
    const res = { status: jest.fn(() => ({ json: jest.fn() })) };

    await settlementController.createSettlement(
      { body: { shopId: "shop-1", totalAmount: 100 } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(processSettlement).not.toHaveBeenCalled();
  });

  it("should return 404 when settlement is missing for payout", async () => {
    Settlement.findById.mockResolvedValue(null);
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) };

    await settlementController.payoutSettlement(
      { params: { settlementId: "set-1" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: "Settlement not found",
      message: "Settlement not found",
    });
    expect(processPayout).not.toHaveBeenCalled();
  });

  it("should forward inventory adjust errors to next", async () => {
    const next = jest.fn();
    inventory.createInventoryEntry.mockRejectedValue(new Error("inventory failed"));

    await inventoryController.adjustStock(
      {
        shop: { _id: "shop-1" },
        user: { _id: "user-1" },
        body: { product: "prod-1", quantity: 5, note: "fix" },
        lang: "en",
      },
      { json: jest.fn() },
      next
    );

    expect(next).toHaveBeenCalled();
  });
});
