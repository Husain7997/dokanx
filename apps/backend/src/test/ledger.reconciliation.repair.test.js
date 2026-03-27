jest.useRealTimers();

const AccountingEntry = require("../modules/wallet-engine/accountingEntry.model");
const Order = require("../models/order.model");
const Wallet = require("../models/wallet.model");
const User = require("../models/user.model");
const walletService = require("../services/wallet.service");
const reconciliationService = require("../services/ledger-reconciliation.service");
const { createShopWallet, createUser } = require("./helpers/testHelpers");

function createAccountingRow({ shopId, referenceId, transactionType, amount, walletType = "CASH" }) {
  const normalizedWalletType = String(walletType || "CASH").toUpperCase();
  return AccountingEntry.create({
    shopId,
    customerId: null,
    walletType: normalizedWalletType,
    transactionType,
    amount,
    direction: transactionType === "income" ? "credit" : "debit",
    referenceId,
    debitAccount: transactionType === "income" ? `${normalizedWalletType}_WALLET` : "OPERATING_EXPENSE",
    creditAccount: transactionType === "income" ? "SALES_REVENUE" : `${normalizedWalletType}_WALLET`,
    metadata: { source: "test" },
  });
}

describe("Shop ledger reconciliation and hard fail", () => {
  beforeEach(async () => {
    await Promise.all([
      AccountingEntry.deleteMany({}),
      Order.deleteMany({}),
      Wallet.deleteMany({}),
      User.deleteMany({ email: /@test\.com$/ }),
    ]);
  });

  it("detects wallet drift and repairs wallet from ledger", async () => {
    const { shop } = await createShopWallet({ balance: 500 });

    await createAccountingRow({ shopId: shop._id, referenceId: `income-${Date.now()}`, transactionType: "income", amount: 200 });
    await createAccountingRow({ shopId: shop._id, referenceId: `expense-${Date.now()}`, transactionType: "expense", amount: 50 });

    const before = await reconciliationService.getShopReconciliationReport(shop._id);
    expect(before.hasMismatch).toBe(true);
    expect(before.expectedWallet.balance).toBe(150);
    expect(before.wallet.balance).toBe(500);

    const repaired = await reconciliationService.repairShopFinancialState(shop._id);
    expect(repaired.actions.some((action) => action.type === "wallet_from_ledger")).toBe(true);
    expect(repaired.after.hasMismatch).toBe(false);

    const wallet = await Wallet.findOne({ shopId: shop._id }).lean();
    expect(Number(wallet.balance)).toBe(150);
    expect(Number(wallet.available_balance)).toBe(150);
    expect(Number(wallet.balances.cash)).toBe(150);
  }, 30000);

  it("repairs missing order ledger entries from paid orders", async () => {
    const { shop } = await createShopWallet({ balance: 0 });
    const customer = await createUser({ role: "CUSTOMER", email: `ledger-customer-${Date.now()}@test.com` });

    const order = await Order.create({
      shopId: shop._id,
      customerId: customer._id,
      items: [],
      totalAmount: 80,
      paymentMode: "ONLINE",
      paymentStatus: "SUCCESS",
      status: "CONFIRMED",
    });

    const before = await reconciliationService.getShopReconciliationReport(shop._id);
    expect(before.missingLedgerEntries).toHaveLength(1);
    expect(before.missingLedgerEntries[0].orderId).toBe(String(order._id));

    const repaired = await reconciliationService.repairShopFinancialState(shop._id);
    expect(repaired.actions.some((action) => action.type === "ledger_from_orders")).toBe(true);
    expect(repaired.after.hasMismatch).toBe(false);

    const [entry, wallet] = await Promise.all([
      AccountingEntry.findOne({ shopId: shop._id, referenceId: String(order._id), transactionType: "income" }).lean(),
      Wallet.findOne({ shopId: shop._id }).lean(),
    ]);

    expect(Number(entry.amount)).toBe(80);
    expect(Number(wallet.balance)).toBe(80);
  }, 30000);

  it("blocks new wallet transactions when the shop ledger is already inconsistent", async () => {
    const { shop } = await createShopWallet({ balance: 999 });

    await expect(
      walletService.creditWallet({
        shopId: shop._id,
        amount: 25,
        referenceId: `blocked-${Date.now()}`,
      })
    ).rejects.toMatchObject({ code: "CRITICAL_LEDGER_MISMATCH" });

    const [wallet, entries] = await Promise.all([
      Wallet.findOne({ shopId: shop._id }).lean(),
      AccountingEntry.find({ shopId: shop._id }).lean(),
    ]);

    expect(Number(wallet.balance)).toBe(999);
    expect(entries).toHaveLength(0);
  }, 30000);
});
