const Wallet = require("../models/wallet.model");
const Order = require("../models/order.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const AccountingEntry = require("../modules/wallet-engine/accountingEntry.model");
const logger = require("@/core/infrastructure/logger");

const NON_SHOP_WALLET_SOURCES = new Set([
  "customer_wallet_debit",
  "credit_wallet_repayment",
]);

function toId(value) {
  return value ? String(value) : null;
}

function roundAmount(value) {
  return Number((Number(value || 0)).toFixed(2));
}

function buildAccounts(transactionType, walletType) {
  const suffix = String(walletType || "CASH").toUpperCase();
  if (transactionType === "income") {
    return { debitAccount: `${suffix}_WALLET`, creditAccount: "SALES_REVENUE" };
  }
  if (transactionType === "expense") {
    return { debitAccount: "OPERATING_EXPENSE", creditAccount: `${suffix}_WALLET` };
  }
  if (transactionType === "cheque") {
    return { debitAccount: "CHEQUE_CLEARING", creditAccount: `${suffix}_WALLET` };
  }
  return { debitAccount: `${suffix}_WALLET`, creditAccount: `${suffix}_WALLET_TRANSFER` };
}

function walletTypeFromOrder(order) {
  return String(order?.paymentMode || "ONLINE").toUpperCase() === "CREDIT" ? "CREDIT" : "CASH";
}

function isPaidOrder(order) {
  return String(order?.paymentStatus || "").toUpperCase() === "SUCCESS";
}

function entryAffectsShopWallet(entry) {
  if (typeof entry?.metadata?.affectsShopWallet === "boolean") {
    return entry.metadata.affectsShopWallet;
  }

  const source = String(entry?.metadata?.source || "");
  return !NON_SHOP_WALLET_SOURCES.has(source);
}

function summarizeEntries(entries) {
  const summary = {
    totalCredits: 0,
    totalDebits: 0,
    net: 0,
    cashNet: 0,
    creditNet: 0,
    bankNet: 0,
    totalEntries: 0,
  };

  for (const entry of entries || []) {
    const amount = roundAmount(entry.amount || 0);
    const sign = String(entry.transactionType || "").toLowerCase() === "income" ? 1 : -1;
    const walletType = String(entry.walletType || "CASH").toUpperCase();

    if (sign > 0) {
      summary.totalCredits = roundAmount(summary.totalCredits + amount);
    } else {
      summary.totalDebits = roundAmount(summary.totalDebits + amount);
    }

    summary.net = roundAmount(summary.net + (sign * amount));
    if (walletType === "CREDIT") {
      summary.creditNet = roundAmount(summary.creditNet + (sign * amount));
    } else if (walletType === "BANK") {
      summary.bankNet = roundAmount(summary.bankNet + (sign * amount));
    } else {
      summary.cashNet = roundAmount(summary.cashNet + (sign * amount));
    }
    summary.totalEntries += 1;
  }

  return summary;
}

function findDuplicateEntries(entries) {
  const groups = new Map();
  for (const entry of entries || []) {
    const key = [
      toId(entry.shopId),
      String(entry.referenceId || ""),
      String(entry.transactionType || ""),
      String(entry.walletType || ""),
      String(entry.direction || ""),
    ].join("::");
    const current = groups.get(key) || [];
    current.push(entry);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      key,
      count: rows.length,
      referenceId: String(rows[0]?.referenceId || ""),
      transactionType: String(rows[0]?.transactionType || ""),
      walletType: String(rows[0]?.walletType || ""),
      direction: String(rows[0]?.direction || ""),
      amount: roundAmount(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)),
      entryIds: rows.map((row) => toId(row._id)),
    }));
}

function findOrderLedgerIssues(orders, entries, duplicateEntries) {
  const entryMap = new Map();
  for (const entry of entries || []) {
    const key = String(entry.referenceId || "");
    const current = entryMap.get(key) || [];
    current.push(entry);
    entryMap.set(key, current);
  }

  const duplicateRefs = new Set((duplicateEntries || []).map((row) => String(row.referenceId || "")));
  const issues = [];

  for (const order of orders || []) {
    if (!isPaidOrder(order)) {
      continue;
    }

    const referenceId = toId(order._id);
    const expectedAmount = roundAmount(order.totalAmount || 0);
    const walletType = walletTypeFromOrder(order);
    const matching = (entryMap.get(referenceId) || []).filter((entry) =>
      String(entry.transactionType || "").toLowerCase() === "income" &&
      String(entry.walletType || "CASH").toUpperCase() === walletType
    );
    const actualAmount = roundAmount(matching.reduce((sum, row) => sum + Number(row.amount || 0), 0));

    if (!matching.length) {
      issues.push({
        type: "missing",
        orderId: referenceId,
        paymentMode: order.paymentMode || "ONLINE",
        expectedAmount,
        actualAmount: 0,
        status: order.status || null,
        paymentStatus: order.paymentStatus || null,
      });
      continue;
    }

    if (duplicateRefs.has(referenceId) || actualAmount !== expectedAmount || matching.length !== 1) {
      issues.push({
        type: actualAmount === expectedAmount && matching.length > 1 ? "duplicate" : "partial",
        orderId: referenceId,
        paymentMode: order.paymentMode || "ONLINE",
        expectedAmount,
        actualAmount,
        ledgerEntryIds: matching.map((row) => toId(row._id)),
        status: order.status || null,
        paymentStatus: order.paymentStatus || null,
      });
    }
  }

  return issues;
}

function findPartialTransactions(paymentAttempts, orderIssues) {
  const orderIssueMap = new Map((orderIssues || []).map((issue) => [String(issue.orderId || ""), issue]));
  return (paymentAttempts || [])
    .filter((attempt) => String(attempt.status || "") === "SUCCESS" && attempt.processed)
    .map((attempt) => {
      const issue = orderIssueMap.get(toId(attempt.order));
      if (!issue) {
        return null;
      }
      return {
        paymentAttemptId: toId(attempt._id),
        orderId: toId(attempt.order),
        providerPaymentId: attempt.providerPaymentId || null,
        amount: roundAmount(attempt.amount || 0),
        issueType: issue.type,
      };
    })
    .filter(Boolean);
}

async function getShopReconciliationReport(shopId, { session = null } = {}) {
  const [wallet, entries, orders, paymentAttempts] = await Promise.all([
    Wallet.findOne({ shopId }).session(session || null).lean(),
    AccountingEntry.find({ shopId }).session(session || null).sort({ createdAt: 1 }).lean(),
    Order.find({ shopId }).session(session || null).select("totalAmount paymentStatus paymentMode status customerId").lean(),
    PaymentAttempt.find({ shopId }).session(session || null).select("order amount status processed providerPaymentId").lean(),
  ]);

  const shopEntries = (entries || []).filter(entryAffectsShopWallet);
  const ledger = summarizeEntries(shopEntries);
  const duplicateEntries = findDuplicateEntries(shopEntries);
  const orderIssues = findOrderLedgerIssues(orders, shopEntries, duplicateEntries);
  const partialTransactions = findPartialTransactions(paymentAttempts, orderIssues);
  const paidOrders = (orders || []).filter(isPaidOrder);
  const paidOrderTotal = roundAmount(paidOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0));

  const walletSnapshot = {
    exists: Boolean(wallet),
    balance: roundAmount(wallet?.balance || 0),
    availableBalance: roundAmount(wallet?.available_balance || 0),
    withdrawableBalance: roundAmount(wallet?.withdrawable_balance || 0),
    cashBalance: roundAmount(wallet?.balances?.cash || 0),
    creditBalance: roundAmount(wallet?.balances?.credit || 0),
    bankBalance: roundAmount(wallet?.balances?.bank || 0),
  };

  const expectedWallet = {
    balance: roundAmount(ledger.net),
    availableBalance: roundAmount(ledger.net),
    withdrawableBalance: roundAmount(Math.max(ledger.net, 0)),
    cashBalance: roundAmount(ledger.cashNet),
    creditBalance: roundAmount(ledger.creditNet),
    bankBalance: roundAmount(ledger.bankNet),
  };

  const walletMismatch = {
    balance: walletSnapshot.balance !== expectedWallet.balance,
    availableBalance: walletSnapshot.availableBalance !== expectedWallet.availableBalance,
    withdrawableBalance: walletSnapshot.withdrawableBalance !== expectedWallet.withdrawableBalance,
    cashBalance: walletSnapshot.cashBalance !== expectedWallet.cashBalance,
    creditBalance: walletSnapshot.creditBalance !== expectedWallet.creditBalance,
    bankBalance: walletSnapshot.bankBalance !== expectedWallet.bankBalance,
  };

  const orderTotalsMismatch = roundAmount(ledger.totalCredits) < paidOrderTotal;
  const hasMismatch =
    Object.values(walletMismatch).some(Boolean) ||
    duplicateEntries.length > 0 ||
    orderIssues.length > 0 ||
    partialTransactions.length > 0 ||
    orderTotalsMismatch;

  return {
    shopId: toId(shopId),
    wallet: walletSnapshot,
    expectedWallet,
    ledger: {
      totalCredits: ledger.totalCredits,
      totalDebits: ledger.totalDebits,
      net: ledger.net,
      totalEntries: ledger.totalEntries,
    },
    orders: {
      paidOrderCount: paidOrders.length,
      paidOrderTotal,
    },
    walletMismatch,
    duplicateEntries,
    missingLedgerEntries: orderIssues.filter((issue) => issue.type === "missing"),
    partialTransactions,
    orderIssues,
    orderTotalsMismatch,
    hasMismatch,
  };
}

async function assertShopFinancialInvariant({ shopId, session = null, referenceId = null } = {}) {
  const report = await getShopReconciliationReport(shopId, { session });
  if (!report.hasMismatch) {
    return report;
  }

  logger.error({
    event: "CRITICAL_LEDGER_MISMATCH",
    shopId: toId(shopId),
    referenceId: referenceId || null,
    walletMismatch: report.walletMismatch,
    duplicateEntries: report.duplicateEntries,
    missingLedgerEntries: report.missingLedgerEntries,
    partialTransactions: report.partialTransactions,
    orderTotalsMismatch: report.orderTotalsMismatch,
  }, "Critical financial invariant failed");

  const error = new Error("CRITICAL_LEDGER_MISMATCH");
  error.statusCode = 409;
  error.code = "CRITICAL_LEDGER_MISMATCH";
  error.retryable = false;
  error.details = report;
  throw error;
}

async function repairOrderLedgerEntries(shopId, orderIssues, session = null) {
  const actions = [];
  for (const issue of orderIssues || []) {
    if (!["missing", "partial"].includes(String(issue.type || ""))) {
      continue;
    }

    const order = await Order.findById(issue.orderId).session(session || null).lean();
    if (!order || !isPaidOrder(order)) {
      continue;
    }

    const walletType = walletTypeFromOrder(order);
    const accounts = buildAccounts("income", walletType);
    await AccountingEntry.findOneAndUpdate(
      {
        shopId,
        referenceId: String(order._id),
        transactionType: "income",
        walletType,
        direction: "credit",
      },
      {
        $set: {
          shopId,
          customerId: order.customerId ? String(order.customerId) : null,
          walletType,
          transactionType: "income",
          amount: roundAmount(order.totalAmount || 0),
          direction: "credit",
          referenceId: String(order._id),
          debitAccount: accounts.debitAccount,
          creditAccount: accounts.creditAccount,
          metadata: {
            source: "ledger_reconciliation_order_repair",
            repairedAt: new Date().toISOString(),
            orderId: String(order._id),
            paymentMode: order.paymentMode || null,
            affectsShopWallet: true,
          },
        },
      },
      { upsert: true, returnDocument: "after", session }
    );

    actions.push({
      type: "ledger_from_orders",
      orderId: String(order._id),
      amount: roundAmount(order.totalAmount || 0),
      walletType,
    });
  }
  return actions;
}

async function rebuildWalletFromLedger(shopId, session = null) {
  const report = await getShopReconciliationReport(shopId, { session });
  const wallet = await Wallet.findOneAndUpdate(
    { shopId },
    {
      $set: {
        balance: report.expectedWallet.balance,
        available_balance: report.expectedWallet.availableBalance,
        withdrawable_balance: report.expectedWallet.withdrawableBalance,
        balances: {
          cash: report.expectedWallet.cashBalance,
          credit: report.expectedWallet.creditBalance,
          bank: report.expectedWallet.bankBalance,
        },
      },
      $setOnInsert: {
        shopId,
        currency: "BDT",
        status: "ACTIVE",
        isFrozen: false,
      },
    },
    { returnDocument: "after", upsert: true, session }
  );

  return {
    type: "wallet_from_ledger",
    walletId: toId(wallet?._id),
    balance: roundAmount(wallet?.balance || 0),
  };
}

async function repairShopFinancialState(shopId, { session = null, repairOrderLedger = true } = {}) {
  const before = await getShopReconciliationReport(shopId, { session });
  const actions = [];

  if (repairOrderLedger) {
    actions.push(...await repairOrderLedgerEntries(shopId, before.orderIssues, session));
  }

  actions.push(await rebuildWalletFromLedger(shopId, session));
  const after = await getShopReconciliationReport(shopId, { session });

  logger.info({
    event: "LEDGER_RECONCILIATION_REPAIR_APPLIED",
    shopId: toId(shopId),
    actions,
    beforeHasMismatch: before.hasMismatch,
    afterHasMismatch: after.hasMismatch,
  }, "Ledger reconciliation repair applied");

  return {
    shopId: toId(shopId),
    before,
    actions,
    after,
  };
}

async function listMismatchedShops() {
  const [walletShopIds, entryShopIds, orderShopIds] = await Promise.all([
    Wallet.distinct("shopId"),
    AccountingEntry.distinct("shopId"),
    Order.distinct("shopId"),
  ]);

  const shopIds = Array.from(new Set([
    ...walletShopIds.map(toId),
    ...entryShopIds.map(toId),
    ...orderShopIds.map(toId),
  ].filter(Boolean)));

  const reports = [];
  for (const shopId of shopIds) {
    const report = await getShopReconciliationReport(shopId);
    if (report.hasMismatch) {
      reports.push(report);
    }
  }
  return reports;
}

module.exports = {
  assertShopFinancialInvariant,
  getShopReconciliationReport,
  listMismatchedShops,
  repairShopFinancialState,
};

