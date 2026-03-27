jest.useRealTimers();

const User = require("../models/user.model");
const AccountingEntry = require("../modules/wallet-engine/accountingEntry.model");
const walletService = require("../services/wallet.service");
const { createShopWallet, createUser } = require("./helpers/testHelpers");

describe("Customer wallet duplicate protection", () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({ email: /wallet-customer-.*@test\.com$/ }),
      AccountingEntry.deleteMany({}),
    ]);
  });

  it("does not deduct a customer wallet twice for the same reference", async () => {
    const { shop } = await createShopWallet({ balance: 0 });
    const customer = await createUser({
      role: "CUSTOMER",
      email: `wallet-customer-${Date.now()}@test.com`,
    });

    customer.customerWallet = {
      cash: 250,
      credit: 0,
      bank: 0,
      updatedAt: new Date(),
    };
    await customer.save();

    const referenceId = `wallet-order-${Date.now()}`;
    const results = await Promise.all([
      walletService.debitCustomerWallet({
        userId: customer._id,
        globalCustomerId: customer.globalCustomerId,
        shopId: shop._id,
        amount: 90,
        walletType: "CASH",
        referenceId,
      }),
      walletService.debitCustomerWallet({
        userId: customer._id,
        globalCustomerId: customer.globalCustomerId,
        shopId: shop._id,
        amount: 90,
        walletType: "CASH",
        referenceId,
      }),
    ]);

    const [freshCustomer, entries] = await Promise.all([
      User.findById(customer._id).lean(),
      AccountingEntry.find({
        shopId: shop._id,
        customerId: customer.globalCustomerId,
        referenceId,
        transactionType: "expense",
      }).lean(),
    ]);

    expect(results).toHaveLength(2);
    expect(Number(freshCustomer.customerWallet.cash)).toBe(160);
    expect(entries).toHaveLength(1);
    expect(Number(entries[0].amount)).toBe(90);
  }, 30000);
});
