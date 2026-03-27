const {
  FinancialEngine,
  FinancialTypes,
} =
 require("@/core/financial");
const mongoose =
 require("mongoose");

const { runOnce } =
 require("@/core/infrastructure");
const walletAdapter =
 require("./wallet/walletAdapter.service");
const accountingService =
 require("../modules/wallet-engine/accounting.service");
const AccountingEntry =
 require("../modules/wallet-engine/accountingEntry.model");
const User =
 require("../models/user.model");
const logger =
 require("@/core/infrastructure/logger");

function normalizeCustomerWallet(wallet = {}) {
  return {
    cash: Number(wallet.cash || 0),
    credit: Number(wallet.credit || 0),
    bank: Number(wallet.bank || 0),
  };
}

async function getCustomerWalletSummary({
  userId,
  globalCustomerId,
  limit = 10,
}) {
  if (!userId) {
    const error = new Error("Customer userId is required");
    error.statusCode = 400;
    throw error;
  }

  const resolvedCustomerId = globalCustomerId || null;
  const [user, aggregateRows, lastTransactions] = await Promise.all([
    User.findById(userId).select("customerWallet globalCustomerId").lean(),
    resolvedCustomerId
      ? AccountingEntry.aggregate([
          { $match: { customerId: resolvedCustomerId } },
          {
            $group: {
              _id: null,
              totalCredits: {
                $sum: {
                  $cond: [{ $eq: ["$transactionType", "income"] }, "$amount", 0],
                },
              },
              totalDebits: {
                $sum: {
                  $cond: [{ $eq: ["$transactionType", "expense"] }, "$amount", 0],
                },
              },
              totalTransactions: { $sum: 1 },
            },
          },
        ])
      : [],
    resolvedCustomerId
      ? AccountingEntry.find({ customerId: resolvedCustomerId })
          .sort({ createdAt: -1 })
          .limit(Number(limit || 10))
          .lean()
      : [],
  ]);

  const balance = normalizeCustomerWallet(user?.customerWallet);
  const aggregate = aggregateRows?.[0] || {};
  const ledgerSummary = {
    totalCredits: Number(aggregate.totalCredits || 0),
    totalDebits: Number(aggregate.totalDebits || 0),
    totalTransactions: Number(aggregate.totalTransactions || 0),
  };

  return {
    balance,
    ledgerSummary,
    lastTransactions: (lastTransactions || []).map((entry) => ({
      _id: entry._id,
      amount: Number(entry.amount || 0),
      walletType: entry.walletType || "CASH",
      transactionType: entry.transactionType || "income",
      direction: entry.direction || "credit",
      referenceId: entry.referenceId || null,
      shopId: entry.shopId || null,
      orderId: entry.metadata?.orderId || entry.referenceId || null,
      note: entry.metadata?.note || entry.metadata?.source || null,
      createdAt: entry.createdAt || null,
    })),
  };
}

async function debitCustomerWallet({
  userId,
  globalCustomerId,
  shopId,
  amount,
  walletType = "CASH",
  referenceId,
  metadata = {},
  session = null,
}) {
  const numericAmount = Math.abs(Number(amount || 0));
  const normalizedWalletType = String(walletType || "CASH").toUpperCase();
  const balanceKey =
    normalizedWalletType === "BANK"
      ? "bank"
      : normalizedWalletType === "CREDIT"
        ? "credit"
        : "cash";

  if (!userId || !referenceId) {
    const error = new Error("userId and referenceId are required");
    error.statusCode = 400;
    throw error;
  }

  return runOnce(
    `customer-wallet-debit:${userId}:${String(referenceId)}`,
    async () => {
      const preUser = await User.findById(userId)
        .select("customerWallet")
        .session(session || null)
        .lean();
      if (!preUser) {
        const error = new Error("Customer not found");
        error.statusCode = 404;
        throw error;
      }

      const preBalance = normalizeCustomerWallet(preUser.customerWallet);
      if (preBalance[balanceKey] < numericAmount) {
        const error = new Error(`Insufficient wallet balance. Available ${preBalance[balanceKey]} BDT.`);
        error.statusCode = 400;
        error.code = "WALLET_INSUFFICIENT_BALANCE";
        error.availableBalance = preBalance[balanceKey];
        throw error;
      }

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          [`customerWallet.${balanceKey}`]: { $gte: numericAmount },
        },
        {
          $inc: { [`customerWallet.${balanceKey}`]: -numericAmount },
          $set: { "customerWallet.updatedAt": new Date() },
        },
        { new: true, session: session || undefined }
      );

      if (!user) {
        const current = await User.findById(userId)
          .select("customerWallet")
          .session(session || null)
          .lean();
        const currentBalance = normalizeCustomerWallet(current?.customerWallet);
        const error = new Error(`Insufficient wallet balance. Available ${currentBalance[balanceKey]} BDT.`);
        error.statusCode = 400;
        error.code = "WALLET_INSUFFICIENT_BALANCE";
        error.availableBalance = currentBalance[balanceKey];
        throw error;
      }

      if (shopId && globalCustomerId) {
        await accountingService.addTransaction({
          shopId,
          customerId: globalCustomerId,
          type: "expense",
          walletType: normalizedWalletType,
          amount: numericAmount,
          referenceId: String(referenceId),
          metadata: {
            ...metadata,
            source: metadata.source || "customer_wallet_debit",
          },
          applyWalletBalance: false,
          session,
        });
      } else {
        logger.warn({
          event: "CUSTOMER_WALLET_LEDGER_SKIPPED",
          userId: String(userId),
          globalCustomerId: globalCustomerId || null,
          shopId: shopId || null,
          referenceId: String(referenceId),
        }, "Customer wallet debited without full ledger context");
      }

      await verifyCustomerWalletDebitInvariant({
        userId,
        globalCustomerId,
        shopId,
        referenceId: String(referenceId),
        walletType: normalizedWalletType,
        amount: numericAmount,
        preBalance,
        nextBalance: normalizeCustomerWallet(user.customerWallet),
        session,
      });

      return {
        balance: normalizeCustomerWallet(user.customerWallet),
        debitedAmount: numericAmount,
        walletType: normalizedWalletType,
      };
    },
    {
      scope: "wallet",
      route: "customer-wallet-debit",
      requestHash: JSON.stringify({
        userId: String(userId),
        shopId: shopId ? String(shopId) : null,
        amount: numericAmount,
        walletType: normalizedWalletType,
        referenceId: String(referenceId),
      }),
    }
  );
}

async function verifyCustomerWalletDebitInvariant({
  userId,
  globalCustomerId,
  shopId,
  referenceId,
  walletType,
  amount,
  preBalance,
  nextBalance,
  session = null,
}) {
  const normalizedType = String(walletType || "CASH").toUpperCase();
  const balanceKey =
    normalizedType === "BANK"
      ? "bank"
      : normalizedType === "CREDIT"
        ? "credit"
        : "cash";
  const expectedBalance = Number((Number(preBalance?.[balanceKey] || 0) - Number(amount || 0)).toFixed(2));
  const actualBalance = Number(nextBalance?.[balanceKey] || 0);
  if (expectedBalance !== actualBalance) {
    logger.warn({
      event: "CUSTOMER_WALLET_BALANCE_MISMATCH",
      userId: String(userId),
      globalCustomerId: globalCustomerId || null,
      shopId: shopId ? String(shopId) : null,
      referenceId,
      walletType: normalizedType,
      amount: Number(amount || 0),
      expectedBalance,
      actualBalance,
    }, "Customer wallet balance invariant failed");
  }

  if (!shopId || !globalCustomerId) {
    return;
  }

  const entry = await AccountingEntry.findOne({
    shopId,
    customerId: globalCustomerId,
    referenceId,
    transactionType: "expense",
    walletType: normalizedType,
  })
    .session(session || null)
    .lean();

  if (!entry || Number(entry.amount || 0) !== Number(amount || 0)) {
    logger.warn({
      event: "CUSTOMER_WALLET_LEDGER_MISMATCH",
      userId: String(userId),
      globalCustomerId,
      shopId: String(shopId),
      referenceId,
      walletType: normalizedType,
      expectedAmount: Number(amount || 0),
      ledgerAmount: Number(entry?.amount || 0),
      ledgerEntryId: entry?._id ? String(entry._id) : null,
    }, "Customer wallet ledger invariant failed");
  }
}

function normalizeWalletInput(input = {}) {
  return walletAdapter.normalizeReference(input);
}

async function creditWallet({
  shopId,
  amount,
  referenceId,
  reference,
  session = null,
}) {
  const normalized = normalizeWalletInput({
    shopId,
    amount,
    referenceId,
    reference,
  });

  return runOnce(
    `wallet-credit:${normalized.referenceId}`,
    async () => {
      const ownedSession = !session;
      const activeSession = session || await mongoose.startSession();
      try {
        if (ownedSession) {
          activeSession.startTransaction();
        }
        const result = await FinancialEngine.execute({
          shopId: normalized.shopId,
          amount: normalized.amount,
          type: "WALLET_CREDIT",
          referenceId: normalized.referenceId,
          session: activeSession,
        });
        await accountingService.addTransaction({
          shopId: normalized.shopId,
          type: "income",
          walletType: "CASH",
          amount: normalized.amount,
          referenceId: normalized.referenceId,
          metadata: { source: "wallet_credit" },
          applyWalletBalance: false,
          session: activeSession,
        });
        await verifyShopWalletPostingInvariant({
          shopId: normalized.shopId,
          referenceId: normalized.referenceId,
          transactionType: "income",
          walletType: "CASH",
          amount: normalized.amount,
          session: activeSession,
        });
        if (ownedSession) {
          await activeSession.commitTransaction();
        }
        logger.info({
          event: "SHOP_WALLET_CREDIT_APPLIED",
          shopId: String(normalized.shopId),
          referenceId: normalized.referenceId,
          amount: normalized.amount,
        }, "Shop wallet credited");
        return result;
      } catch (error) {
        if (ownedSession) {
          await activeSession.abortTransaction();
        }
        throw error;
      } finally {
        if (ownedSession) {
          activeSession.endSession();
        }
      }
    }
  );
}

async function debitWallet({
  shopId,
  amount,
  referenceId,
  reference,
  session = null,
}) {
  const normalized = normalizeWalletInput({
    shopId,
    amount,
    referenceId,
    reference,
  });

  return runOnce(
    `wallet-debit:${normalized.referenceId}`,
    async () => {
      const ownedSession = !session;
      const activeSession = session || await mongoose.startSession();
      try {
        if (ownedSession) {
          activeSession.startTransaction();
        }
        const result = await FinancialEngine.execute({
          shopId: normalized.shopId,
          amount: -Math.abs(normalized.amount),
          type: "WALLET_DEBIT",
          referenceId: normalized.referenceId,
          session: activeSession,
        });
        await accountingService.addTransaction({
          shopId: normalized.shopId,
          type: "expense",
          walletType: "CASH",
          amount: normalized.amount,
          referenceId: normalized.referenceId,
          metadata: { source: "wallet_debit" },
          applyWalletBalance: false,
          session: activeSession,
        });
        await verifyShopWalletPostingInvariant({
          shopId: normalized.shopId,
          referenceId: normalized.referenceId,
          transactionType: "expense",
          walletType: "CASH",
          amount: normalized.amount,
          session: activeSession,
        });
        if (ownedSession) {
          await activeSession.commitTransaction();
        }
        logger.info({
          event: "SHOP_WALLET_DEBIT_APPLIED",
          shopId: String(normalized.shopId),
          referenceId: normalized.referenceId,
          amount: normalized.amount,
        }, "Shop wallet debited");
        return result;
      } catch (error) {
        if (ownedSession) {
          await activeSession.abortTransaction();
        }
        throw error;
      } finally {
        if (ownedSession) {
          activeSession.endSession();
        }
      }
    }
  );
}

async function addTransaction(input) {
  const normalized = normalizeWalletInput(input);
  return accountingService.addTransaction({
    ...normalized,
    metadata: normalized.metadata || {},
    session: normalized.session || null,
  });
}

async function getLedger(filters) {
  return accountingService.getLedger(filters);
}

async function generateReport(filters) {
  const report = await accountingService.generateReport(filters);
  report.profitLoss = Number((report.totalIncome - report.totalExpense).toFixed(2));
  return report;
}

async function verifyShopWalletPostingInvariant({
  shopId,
  referenceId,
  transactionType,
  walletType,
  amount,
  session = null,
}) {
  const entry = await AccountingEntry.findOne({
    shopId,
    referenceId,
    transactionType,
    walletType,
  })
    .session(session || null)
    .lean();

  if (!entry || Number(entry.amount || 0) !== Number(amount || 0)) {
    logger.warn({
      event: "SHOP_WALLET_LEDGER_MISMATCH",
      shopId: String(shopId),
      referenceId,
      transactionType,
      walletType,
      expectedAmount: Number(amount || 0),
      ledgerAmount: Number(entry?.amount || 0),
      ledgerEntryId: entry?._id ? String(entry._id) : null,
    }, "Shop wallet posting invariant failed");
  }
}

module.exports = {
  addTransaction,
  creditWallet,
  debitCustomerWallet,
  debitWallet,
  generateReport,
  getCustomerWalletSummary,
  getLedger,
  normalizeWalletInput
};
