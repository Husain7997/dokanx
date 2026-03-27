jest.useRealTimers();

const CreditAccount = require("../modules/credit/credit.account.model");
const CreditLedger = require("../modules/credit/credit.ledger.model");
const CreditSale = require("../modules/credit-engine/creditSale.model");
const AccountingEntry = require("../modules/wallet-engine/accountingEntry.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const creditService = require("../modules/credit-engine/credit.service");
const { createShopWallet, createUser } = require("./helpers/testHelpers");

describe("Credit repayment consistency", () => {
  beforeEach(async () => {
    await Promise.all([
      CreditAccount.deleteMany({}),
      CreditLedger.deleteMany({}),
      CreditSale.deleteMany({}),
      AccountingEntry.deleteMany({}),
      Order.deleteMany({}),
      User.deleteMany({ email: /@test\.com$/ }),
    ]);
  });

  it("keeps outstanding balance and repayment ledger aligned", async () => {
    const { shop } = await createShopWallet({ balance: 0 });
    const customer = await createUser({
      role: "CUSTOMER",
      email: `credit-customer-${Date.now()}@test.com`,
    });

    customer.customerWallet = {
      cash: 400,
      credit: 0,
      bank: 0,
      updatedAt: new Date(),
    };
    await customer.save();

    await CreditAccount.create({
      shopId: shop._id,
      shop: shop._id,
      customerId: customer.globalCustomerId,
      outstandingBalance: 0,
      creditLimit: 1000,
      status: "ACTIVE",
    });

    const order = await Order.create({
      shopId: shop._id,
      customerId: customer._id,
      items: [],
      totalAmount: 300,
      paymentMode: "CREDIT",
      paymentStatus: "UNPAID",
      status: "PLACED",
    });

    const sale = await creditService.createCreditSale({
      orderId: order._id,
      customerId: customer.globalCustomerId,
      shopId: shop._id,
      amount: 300,
    }, { role: "ADMIN" });

    await creditService.payDue({
      creditSaleId: sale._id,
      amount: 120,
      referenceId: `repay-${Date.now()}`,
      paymentMode: "WALLET",
    }, {
      _id: customer._id,
      globalCustomerId: customer.globalCustomerId,
      role: "CUSTOMER",
    });

    const [account, updatedSale, paymentLedger, walletLedger, freshCustomer] = await Promise.all([
      CreditAccount.findOne({ shopId: shop._id, customerId: customer.globalCustomerId }).lean(),
      CreditSale.findById(sale._id).lean(),
      CreditLedger.findOne({ shopId: shop._id, customerId: customer.globalCustomerId, type: "PAYMENT_RECEIVED" }).lean(),
      AccountingEntry.findOne({ shopId: shop._id, customerId: customer.globalCustomerId, transactionType: "income", walletType: "CREDIT" }).lean(),
      User.findById(customer._id).lean(),
    ]);

    expect(Number(account.outstandingBalance)).toBe(180);
    expect(Number(updatedSale.outstandingAmount)).toBe(180);
    expect(updatedSale.status).toBe("PARTIAL");
    expect(Number(paymentLedger.amount)).toBe(120);
    expect(Number(walletLedger.amount)).toBe(120);
    expect(Number(freshCustomer.customerWallet.cash)).toBe(280);
  }, 30000);
});
