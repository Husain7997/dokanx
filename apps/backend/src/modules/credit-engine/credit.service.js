const Order = require("../../models/order.model");
const User = require("../../models/user.model");
const mongoose = require("mongoose");
const CreditAccount = require("../credit/credit.account.model");
const CreditLedger = require("../credit/credit.ledger.model");
const CreditSale = require("./creditSale.model");
const walletService = require("../../services/wallet.service");
const logger = require("@/core/infrastructure/logger");
const { runOnce } = require("@/core/infrastructure");

async function resolveGlobalCustomerId(customerId) {
  const orConditions = [{ globalCustomerId: customerId }];
  if (mongoose.Types.ObjectId.isValid(customerId)) {
    orConditions.push({ _id: customerId });
  }

  const user = await User.findOne({
    $or: orConditions,
  }).select("_id globalCustomerId");
  if (!user) throw new Error("Customer not found");
  return {
    userId: user._id,
    globalCustomerId: user.globalCustomerId,
  };
}

function getRole(requestUser) {
  return String(requestUser?.role || "").toUpperCase();
}

function getScopedShopId(requestUser) {
  return requestUser?.shopId || null;
}

async function assertCreditEligibility({ customerId, shopId, amount }, requestUser) {
  const resolvedCustomer = await resolveGlobalCustomerId(customerId);
  assertCreditAccess(requestUser, {
    customerId: resolvedCustomer.globalCustomerId,
    shopId,
  });

  const account = await CreditAccount.findOne({
    shopId,
    customerId: resolvedCustomer.globalCustomerId,
  }).lean();
  if (!account || Number(account.creditLimit || 0) <= 0) {
    const error = new Error("Credit is not enabled for this customer at this shop");
    error.statusCode = 400;
    error.code = "CREDIT_NOT_ENABLED";
    throw error;
  }
  if (String(account.status || "ACTIVE").toUpperCase() === "BLOCKED") {
    const error = new Error("Credit is blocked for this customer");
    error.statusCode = 403;
    error.code = "CREDIT_BLOCKED";
    throw error;
  }
  const nextOutstanding = Number(account.outstandingBalance || 0) + Number(amount || 0);
  if (nextOutstanding > Number(account.creditLimit || 0)) {
    const error = new Error(`Credit limit exceeded. Available ${Number(account.creditLimit || 0) - Number(account.outstandingBalance || 0)} BDT.`);
    error.statusCode = 400;
    error.code = "CREDIT_LIMIT_EXCEEDED";
    throw error;
  }

  return {
    account,
    resolvedCustomer,
  };
}

function assertCreditAccess(requestUser, { customerId, shopId }) {
  const role = getRole(requestUser);
  if (role === "ADMIN") return;

  if (role === "CUSTOMER") {
    if (requestUser.globalCustomerId !== customerId) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }
    return;
  }

  if (role === "OWNER" || role === "STAFF") {
    if (!requestUser.shopId || String(requestUser.shopId) !== String(shopId)) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }
    return;
  }

  const error = new Error("Forbidden");
  error.statusCode = 403;
  throw error;
}

async function createCreditSale({ orderId, customerId, shopId, amount }, requestUser) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  return runOnce(
    `credit-sale:${String(order._id)}`,
    async () => {
      const resolvedCustomer = await resolveGlobalCustomerId(customerId || order.customerId);
      const resolvedShopId = shopId || order.shopId;
      const numericAmount = Number(amount || order.totalAmount || 0);
      const { account } = await assertCreditEligibility({
        customerId: resolvedCustomer.globalCustomerId,
        shopId: resolvedShopId,
        amount: numericAmount,
      }, requestUser);
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        const sale = await CreditSale.findOneAndUpdate(
          { orderId: order._id },
          {
            orderId: order._id,
            customerId: resolvedCustomer.globalCustomerId,
            shopId: resolvedShopId,
            amount: numericAmount,
            outstandingAmount: numericAmount,
            status: "OPEN",
          },
          { upsert: true, new: true, session }
        );

        await CreditAccount.findOneAndUpdate(
          {
            shopId: resolvedShopId,
            customerId: resolvedCustomer.globalCustomerId,
          },
          {
            $setOnInsert: {
              shop: resolvedShopId,
              shopId: resolvedShopId,
              customerId: resolvedCustomer.globalCustomerId,
              creditLimit: Number(account.creditLimit || 0),
              status: "ACTIVE",
            },
            $inc: { outstandingBalance: numericAmount },
          },
          { upsert: true, new: true, session }
        );

        await CreditLedger.create([{
          shop: resolvedShopId,
          shopId: resolvedShopId,
          customerId: resolvedCustomer.globalCustomerId,
          type: "CREDIT_ISSUED",
          amount: numericAmount,
          status: "POSTED",
          reference: String(order._id),
          meta: { creditSaleId: sale._id, orderId: order._id },
        }], { session });

        order.creditSaleId = sale._id;
        order.paymentMode = "CREDIT";
        order.paymentStatus = "UNPAID";
        if (order.status === "PAYMENT_PENDING" || order.status === "PLACED") {
          order.status = "CONFIRMED";
        }
        order.metadata = {
          ...(order.metadata || {}),
          creditStatus: "UNPAID",
          creditLimit: Number(account.creditLimit || 0),
        };
        await order.save({ session });

        await verifyCreditInvariant({
          customerId: resolvedCustomer.globalCustomerId,
          shopId: resolvedShopId,
          referenceId: String(order._id),
          expectedLedgerType: "CREDIT_ISSUED",
          expectedAmount: numericAmount,
          session,
        });

        await session.commitTransaction();
        logger.info({
          event: "CREDIT_SALE_CREATED",
          creditSaleId: String(sale._id),
          orderId: String(order._id),
          customerId: resolvedCustomer.globalCustomerId,
          shopId: String(resolvedShopId),
          amount: numericAmount,
          outstandingAmount: Number(sale.outstandingAmount || 0),
        }, "Credit sale created");
        return sale;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    {
      scope: "credit",
      route: "credit-sale",
      requestHash: JSON.stringify({ orderId: String(order._id) }),
    }
  );
}

async function getCustomerDue(customerId, requestUser) {
  const resolvedCustomer = await resolveGlobalCustomerId(customerId);
  const sales = await CreditSale.find({ customerId: resolvedCustomer.globalCustomerId }).lean();
  const role = getRole(requestUser);
  const scopedSales =
    role === "OWNER" || role === "STAFF"
      ? sales.filter((sale) => String(sale.shopId || "") === String(requestUser.shopId || ""))
      : sales;

  assertCreditAccess(requestUser, {
    customerId: resolvedCustomer.globalCustomerId,
    shopId: scopedSales[0]?.shopId || requestUser?.shopId || null,
  });

  const shopWise = scopedSales.reduce((acc, sale) => {
    const key = String(sale.shopId);
    acc[key] = (acc[key] || 0) + Number(sale.outstandingAmount || 0);
    return acc;
  }, {});

  return {
    customerId: resolvedCustomer.globalCustomerId,
    totalDue: scopedSales.reduce((sum, sale) => sum + Number(sale.outstandingAmount || 0), 0),
    shopWiseDue: Object.entries(shopWise).map(([shopId, amount]) => ({ shopId, amount })),
    sales: scopedSales,
  };
}

async function getMyCredit(requestUser) {
  const resolvedCustomer = await resolveGlobalCustomerId(requestUser?.globalCustomerId || requestUser?._id);
  const [due, paymentHistory, accounts] = await Promise.all([
    getCustomerDue(resolvedCustomer.globalCustomerId, requestUser),
    CreditLedger.find({
      customerId: resolvedCustomer.globalCustomerId,
      type: "PAYMENT_RECEIVED",
    }).sort({ createdAt: -1 }).lean(),
    CreditAccount.find({
      customerId: resolvedCustomer.globalCustomerId,
    }).sort({ updatedAt: -1 }).lean(),
  ]);

  return {
    customerId: resolvedCustomer.globalCustomerId,
    totalDue: Number(due.totalDue || 0),
    perShopDue: due.shopWiseDue || [],
    sales: due.sales || [],
    paymentHistory,
    creditAccounts: accounts.map((account) => ({
      shopId: account.shopId,
      outstandingBalance: Number(account.outstandingBalance || 0),
      creditLimit: Number(account.creditLimit || 0),
      availableCredit: Math.max(0, Number(account.creditLimit || 0) - Number(account.outstandingBalance || 0)),
      status: account.status || "ACTIVE",
    })),
  };
}

async function getShopCreditCustomers(requestUser) {
  const shopId = getScopedShopId(requestUser);
  if (!shopId) throw new Error("Shop context required");

  const [accounts, ledgers] = await Promise.all([
    CreditAccount.find({ shopId }).sort({ updatedAt: -1 }).lean(),
    CreditLedger.find({ shopId }).sort({ createdAt: -1 }).lean(),
  ]);

  return accounts.map((account) => ({
    customerId: account.customerId,
    outstandingBalance: Number(account.outstandingBalance || 0),
    creditLimit: Number(account.creditLimit || 0),
    availableCredit: Math.max(0, Number(account.creditLimit || 0) - Number(account.outstandingBalance || 0)),
    status: account.status || "ACTIVE",
    paymentHistory: ledgers.filter((row) => String(row.customerId || "") === String(account.customerId || "")),
  }));
}

async function upsertCreditPolicy({ customerId, shopId, creditLimit, status }, requestUser) {
  const resolvedCustomer = await resolveGlobalCustomerId(customerId);
  const resolvedShopId = shopId || getScopedShopId(requestUser);
  assertCreditAccess(requestUser, {
    customerId: resolvedCustomer.globalCustomerId,
    shopId: resolvedShopId,
  });

  return CreditAccount.findOneAndUpdate(
    {
      shopId: resolvedShopId,
      customerId: resolvedCustomer.globalCustomerId,
    },
    {
      $setOnInsert: {
        shop: resolvedShopId,
        shopId: resolvedShopId,
        customerId: resolvedCustomer.globalCustomerId,
        outstandingBalance: 0,
      },
      $set: {
        creditLimit: Math.max(0, Number(creditLimit || 0)),
        status: String(status || "ACTIVE").toUpperCase() === "BLOCKED" ? "BLOCKED" : "ACTIVE",
      },
    },
    { upsert: true, new: true }
  );
}

async function payDue({ creditSaleId, customerId, amount, referenceId, metadata = {}, paymentMode = "ONLINE", provider = null }, requestUser) {
  if (!referenceId) {
    const error = new Error("referenceId is required");
    error.statusCode = 400;
    throw error;
  }

  return runOnce(
    "credit-payment:" + String(referenceId),
    async () => {
      const sale = creditSaleId
        ? await CreditSale.findById(creditSaleId)
        : await CreditSale.findOne({ customerId, status: { $in: ["OPEN", "PARTIAL"] } }).sort({ createdAt: 1 });
      if (!sale) throw new Error("Credit sale not found");

      assertCreditAccess(requestUser, {
        customerId: sale.customerId,
        shopId: sale.shopId,
      });

      const paymentAmount = Math.min(Number(amount || 0), Number(sale.outstandingAmount || 0));
      if (paymentAmount <= 0) throw new Error("Payment amount must be greater than zero");
      const normalizedPaymentMode = String(paymentMode || "ONLINE").toUpperCase();

      if (normalizedPaymentMode === "ONLINE") {
        const existingPayment = (sale.payments || []).find((entry) => String(entry.referenceId || "") === String(referenceId));
        if (existingPayment) {
          return sale;
        }

        sale.payments.push({
          amount: paymentAmount,
          referenceId,
          paidAt: new Date(),
          status: "PENDING",
          metadata: {
            ...metadata,
            paymentMode: normalizedPaymentMode,
            provider: provider || metadata?.provider || null,
          },
        });
        await sale.save();

        logger.info({
          event: "CREDIT_PAYMENT_PENDING",
          creditSaleId: String(sale._id),
          customerId: sale.customerId,
          shopId: String(sale.shopId),
          referenceId: String(referenceId),
          amount: paymentAmount,
          paymentMode: normalizedPaymentMode,
        }, "Credit payment recorded as pending confirmation");

        return sale;
      }

      if (normalizedPaymentMode !== "WALLET") {
        const error = new Error("Unsupported credit payment mode");
        error.statusCode = 400;
        throw error;
      }

      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        const walletPayer = await resolveGlobalCustomerId(sale.customerId);

        await walletService.debitCustomerWallet({
          userId: walletPayer.userId,
          globalCustomerId: walletPayer.globalCustomerId,
          shopId: sale.shopId,
          amount: paymentAmount,
          walletType: "CASH",
          referenceId,
          metadata: {
            ...metadata,
            note: "Credit repayment from customer wallet",
            source: "credit_wallet_repayment",
            creditSaleId: sale._id,
          },
          session,
        });

        sale.outstandingAmount = Number((sale.outstandingAmount - paymentAmount).toFixed(2));
        sale.status = sale.outstandingAmount <= 0 ? "PAID" : "PARTIAL";
        sale.payments.push({
          amount: paymentAmount,
          referenceId,
          paidAt: new Date(),
          confirmedAt: new Date(),
          status: "CONFIRMED",
          metadata: {
            ...metadata,
            paymentMode: normalizedPaymentMode,
            provider: provider || metadata?.provider || null,
          },
        });
        await sale.save({ session });

        await CreditAccount.findOneAndUpdate(
          { shopId: sale.shopId, customerId: sale.customerId },
          { $inc: { outstandingBalance: -paymentAmount } },
          { session }
        );

        await CreditLedger.create([{
          shop: sale.shopId,
          shopId: sale.shopId,
          customerId: sale.customerId,
          type: "PAYMENT_RECEIVED",
          amount: paymentAmount,
          status: "POSTED",
          reference: referenceId,
          meta: {
            creditSaleId: sale._id,
            paymentMode: normalizedPaymentMode,
            provider: provider || metadata?.provider || null,
            ...metadata,
          },
        }], { session });

        await walletService.addTransaction({
          shopId: sale.shopId,
          customerId: sale.customerId,
          type: "income",
          walletType: "CREDIT",
          amount: paymentAmount,
          referenceId,
          metadata: {
            creditSaleId: sale._id,
            paymentMode: normalizedPaymentMode,
            provider: provider || metadata?.provider || null,
            ...metadata,
          },
          session,
        });

        await verifyCreditInvariant({
          customerId: sale.customerId,
          shopId: sale.shopId,
          referenceId: String(referenceId),
          expectedLedgerType: "PAYMENT_RECEIVED",
          expectedAmount: paymentAmount,
          session,
        });

        await session.commitTransaction();
        logger.info({
          event: "CREDIT_PAYMENT_RECORDED",
          creditSaleId: String(sale._id),
          customerId: sale.customerId,
          shopId: String(sale.shopId),
          referenceId: String(referenceId),
          amount: paymentAmount,
          paymentMode: normalizedPaymentMode,
          outstandingAmount: Number(sale.outstandingAmount || 0),
        }, "Credit payment recorded");
        return sale;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    {
      scope: "credit",
      route: "credit-payment",
      requestHash: JSON.stringify({
        creditSaleId: creditSaleId ? String(creditSaleId) : null,
        customerId: customerId || null,
        amount: Number(amount || 0),
        paymentMode: String(paymentMode || "ONLINE").toUpperCase(),
        provider: provider || null,
        referenceId: String(referenceId),
      }),
    }
  );
}

function extractRepaymentReference(payload = {}) {
  return String(
    payload.referenceId ||
    payload.repaymentReferenceId ||
    payload.meta?.referenceId ||
    payload.metadata?.referenceId ||
    ""
  ).trim() || null;
}

async function confirmOnlineRepaymentByReference({
  payload = {},
  providerPaymentId = null,
  provider = null,
  webhookEventId = null,
}) {
  const referenceId = extractRepaymentReference(payload);
  if (!referenceId) {
    return { matched: false };
  }

  return runOnce(
    "credit-payment-confirm:" + String(referenceId) + ":" + String(providerPaymentId || "manual"),
    async () => {
      const existingSale = await CreditSale.findOne({
        payments: {
          $elemMatch: {
            referenceId,
            status: "PENDING",
          },
        },
      });

      if (!existingSale) {
        return { matched: false };
      }

      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        const sale = await CreditSale.findById(existingSale._id).session(session);
        const paymentIndex = (sale.payments || []).findIndex(
          (entry) => String(entry.referenceId || "") === String(referenceId) && String(entry.status || "") === "PENDING"
        );

        if (paymentIndex === -1) {
          await session.abortTransaction();
          return { duplicate: true, matched: true };
        }

        const paymentEntry = sale.payments[paymentIndex];
        const paymentAmount = Math.min(Number(paymentEntry.amount || 0), Number(sale.outstandingAmount || 0));
        if (paymentAmount <= 0) {
          sale.payments[paymentIndex].status = "CONFIRMED";
          sale.payments[paymentIndex].confirmedAt = new Date();
          sale.payments[paymentIndex].providerPaymentId = providerPaymentId || sale.payments[paymentIndex].providerPaymentId || null;
          sale.payments[paymentIndex].metadata = {
            ...(sale.payments[paymentIndex].metadata || {}),
            ...(payload.metadata || payload.meta || {}),
            provider: provider || payload.provider || sale.payments[paymentIndex].metadata?.provider || null,
            webhookEventId: webhookEventId || null,
          };
          await sale.save({ session });
          await session.commitTransaction();
          return { ok: true, matched: true, saleId: String(sale._id) };
        }

        sale.outstandingAmount = Number((sale.outstandingAmount - paymentAmount).toFixed(2));
        sale.status = sale.outstandingAmount <= 0 ? "PAID" : "PARTIAL";
        sale.payments[paymentIndex].status = "CONFIRMED";
        sale.payments[paymentIndex].confirmedAt = new Date();
        sale.payments[paymentIndex].providerPaymentId = providerPaymentId || sale.payments[paymentIndex].providerPaymentId || null;
        sale.payments[paymentIndex].metadata = {
          ...(sale.payments[paymentIndex].metadata || {}),
          ...(payload.metadata || payload.meta || {}),
          provider: provider || payload.provider || sale.payments[paymentIndex].metadata?.provider || null,
          webhookEventId: webhookEventId || null,
        };
        await sale.save({ session });

        await CreditAccount.findOneAndUpdate(
          { shopId: sale.shopId, customerId: sale.customerId },
          { $inc: { outstandingBalance: -paymentAmount } },
          { session }
        );

        await CreditLedger.create([{
          shop: sale.shopId,
          shopId: sale.shopId,
          customerId: sale.customerId,
          type: "PAYMENT_RECEIVED",
          amount: paymentAmount,
          status: "POSTED",
          reference: referenceId,
          meta: {
            creditSaleId: sale._id,
            paymentMode: "ONLINE",
            provider: provider || payload.provider || sale.payments[paymentIndex].metadata?.provider || null,
            providerPaymentId: providerPaymentId || null,
            webhookEventId: webhookEventId || null,
            ...(payload.metadata || payload.meta || {}),
          },
        }], { session });

        await walletService.addTransaction({
          shopId: sale.shopId,
          customerId: sale.customerId,
          type: "income",
          walletType: "CREDIT",
          amount: paymentAmount,
          referenceId,
          metadata: {
            creditSaleId: sale._id,
            paymentMode: "ONLINE",
            provider: provider || payload.provider || sale.payments[paymentIndex].metadata?.provider || null,
            providerPaymentId: providerPaymentId || null,
            webhookEventId: webhookEventId || null,
            ...(payload.metadata || payload.meta || {}),
          },
          session,
        });

        await verifyCreditInvariant({
          customerId: sale.customerId,
          shopId: sale.shopId,
          referenceId: String(referenceId),
          expectedLedgerType: "PAYMENT_RECEIVED",
          expectedAmount: paymentAmount,
          session,
        });

        await session.commitTransaction();
        logger.info({
          event: "CREDIT_PAYMENT_CONFIRMED",
          creditSaleId: String(sale._id),
          customerId: sale.customerId,
          shopId: String(sale.shopId),
          referenceId: String(referenceId),
          providerPaymentId: providerPaymentId || null,
          amount: paymentAmount,
          outstandingAmount: Number(sale.outstandingAmount || 0),
        }, "Credit payment confirmed from webhook");
        return { ok: true, matched: true, saleId: String(sale._id) };
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    {
      scope: "credit",
      route: "credit-payment-confirm",
      requestHash: JSON.stringify({
        referenceId,
        providerPaymentId: providerPaymentId || null,
        webhookEventId: webhookEventId || null,
      }),
    }
  );
}

async function failOnlineRepaymentByReference({
  payload = {},
  providerPaymentId = null,
  provider = null,
  webhookEventId = null,
}) {
  const referenceId = extractRepaymentReference(payload);
  if (!referenceId) {
    return { matched: false };
  }

  const sale = await CreditSale.findOne({
    payments: {
      $elemMatch: {
        referenceId,
        status: "PENDING",
      },
    },
  });

  if (!sale) {
    return { matched: false };
  }

  const paymentIndex = (sale.payments || []).findIndex(
    (entry) => String(entry.referenceId || "") === String(referenceId) && String(entry.status || "") === "PENDING"
  );

  if (paymentIndex === -1) {
    return { duplicate: true, matched: true };
  }

  sale.payments[paymentIndex].status = "FAILED";
  sale.payments[paymentIndex].providerPaymentId = providerPaymentId || sale.payments[paymentIndex].providerPaymentId || null;
  sale.payments[paymentIndex].metadata = {
    ...(sale.payments[paymentIndex].metadata || {}),
    ...(payload.metadata || payload.meta || {}),
    provider: provider || payload.provider || sale.payments[paymentIndex].metadata?.provider || null,
    webhookEventId: webhookEventId || null,
  };
  await sale.save();

  logger.warn({
    event: "CREDIT_PAYMENT_FAILED",
    creditSaleId: String(sale._id),
    customerId: sale.customerId,
    shopId: String(sale.shopId),
    referenceId: String(referenceId),
    providerPaymentId: providerPaymentId || null,
  }, "Credit payment marked failed from webhook");

  return { ok: false, matched: true, saleId: String(sale._id) };
}

async function verifyCreditInvariant({
  customerId,
  shopId,
  referenceId,
  expectedLedgerType,
  expectedAmount = null,
  session = null,
}) {
  const [account, sales, ledger] = await Promise.all([
    CreditAccount.findOne({ shopId, customerId }).session(session || null).lean(),
    CreditSale.find({ shopId, customerId, status: { $in: ["OPEN", "PARTIAL", "PAID"] } })
      .session(session || null)
      .lean(),
    CreditLedger.findOne({
      shopId,
      customerId,
      reference: referenceId,
      type: expectedLedgerType,
    }).session(session || null).lean(),
  ]);

  const expectedOutstanding = Number(
    (sales || []).reduce((sum, sale) => sum + Number(sale.outstandingAmount || 0), 0).toFixed(2)
  );
  const accountOutstanding = Number(account?.outstandingBalance || 0);

  if (expectedOutstanding !== accountOutstanding) {
    logger.warn({
      event: "CREDIT_OUTSTANDING_MISMATCH",
      customerId,
      shopId: String(shopId),
      referenceId,
      expectedOutstanding,
      accountOutstanding,
      creditAccountId: account?._id ? String(account._id) : null,
    }, "Credit outstanding invariant failed");
  }

  if (!ledger) {
    logger.warn({
      event: "CREDIT_LEDGER_MISSING",
      customerId,
      shopId: String(shopId),
      referenceId,
      expectedLedgerType,
    }, "Credit ledger entry missing for financial action");
  } else if (expectedAmount !== null && Number(ledger.amount || 0) !== Number(expectedAmount || 0)) {
    logger.warn({
      event: "CREDIT_LEDGER_AMOUNT_MISMATCH",
      customerId,
      shopId: String(shopId),
      referenceId,
      expectedLedgerType,
      expectedAmount: Number(expectedAmount || 0),
      ledgerAmount: Number(ledger.amount || 0),
      creditLedgerId: String(ledger._id),
    }, "Credit ledger amount invariant failed");
  }
}

module.exports = {
  assertCreditEligibility,
  createCreditSale,
  getCustomerDue,
  getMyCredit,
  getShopCreditCustomers,
  payDue,
  confirmOnlineRepaymentByReference,
  failOnlineRepaymentByReference,
  upsertCreditPolicy,
};

