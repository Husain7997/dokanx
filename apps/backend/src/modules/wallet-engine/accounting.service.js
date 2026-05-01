const AccountingEntry = require("./accountingEntry.model");
const walletAdapter = require("../../services/wallet/walletAdapter.service");
const { assertShopFinancialInvariant } = require("../../services/ledger-reconciliation.service");

function walletKey(walletType) {
  const normalized = String(walletType || "CASH").toUpperCase();
  if (normalized === "BANK") return "bank";
  if (normalized === "CREDIT") return "credit";
  return "cash";
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

async function addTransaction({
  shopId,
  customerId = null,
  type,
  walletType = "CASH",
  amount,
  referenceId,
  metadata = {},
  targetWalletType = null,
  applyWalletBalance = true,
  session = null,
}) {
  const transactionType = String(type || "income").toLowerCase();
  const normalizedWalletType = String(walletType || "CASH").toUpperCase();
  const numericAmount = Math.abs(Number(amount || 0));
  const accounts = buildAccounts(transactionType, normalizedWalletType);
  const direction = transactionType === "income" ? "credit" : "debit";

  await walletAdapter.ensureWallet(shopId, {}, { session });
  await assertShopFinancialInvariant({ shopId, session, referenceId: String(referenceId) });

  const entry = await AccountingEntry.findOneAndUpdate(
    {
      shopId,
      referenceId,
      transactionType,
      walletType: normalizedWalletType,
      direction,
    },
    {
      shopId,
      customerId,
      walletType: normalizedWalletType,
      transactionType,
      amount: numericAmount,
      direction,
      referenceId,
      debitAccount: accounts.debitAccount,
      creditAccount: accounts.creditAccount,
      metadata: {
        ...metadata,
        targetWalletType,
        affectsShopWallet: applyWalletBalance,
      },
    },
    { upsert: true, returnDocument: "after", session }
  );

  if (applyWalletBalance) {
    const sourceKey = `balances.${walletKey(normalizedWalletType)}`;
    const inc = {};

    if (transactionType === "transfer" && targetWalletType) {
      const targetKey = `balances.${walletKey(targetWalletType)}`;
      inc[sourceKey] = -numericAmount;
      inc[targetKey] = numericAmount;
    } else {
      const signedAmount = transactionType === "income" ? numericAmount : -numericAmount;
      inc.balance = signedAmount;
      inc.available_balance = signedAmount;
      inc.withdrawable_balance = signedAmount;
      inc[sourceKey] = signedAmount;
    }

    await walletAdapter.findOneAndUpdate(
      { shopId },
      { $inc: inc },
      { returnDocument: "after", session }
    );
  }

  await assertShopFinancialInvariant({ shopId, session, referenceId: String(referenceId) });
  return entry;
}

async function getLedger({ shopId, customerId, dateFrom, dateTo, type, walletType, limit = 100 }) {
  const query = { shopId };
  if (customerId) query.customerId = customerId;
  if (type) query.transactionType = String(type).toLowerCase();
  if (walletType) query.walletType = String(walletType).toUpperCase();
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }
  return AccountingEntry.find(query).sort({ createdAt: -1 }).limit(Number(limit || 100)).lean();
}

async function generateReport(filters) {
  const rows = await getLedger({ ...filters, limit: 1000 });
  const summary = rows.reduce(
    (acc, row) => {
      if (row.transactionType === "income") acc.totalIncome += Number(row.amount || 0);
      if (row.transactionType === "expense") acc.totalExpense += Number(row.amount || 0);
      if (row.transactionType === "cheque") acc.totalCheque += Number(row.amount || 0);
      if (row.walletType === "CREDIT" && row.transactionType === "income") {
        acc.totalDue += Number(row.amount || 0);
      }
      return acc;
    },
    {
      totalIncome: 0,
      totalExpense: 0,
      totalCheque: 0,
      totalDue: 0,
      profitLoss: 0,
      rows,
    }
  );
  summary.profitLoss = Number((summary.totalIncome - summary.totalExpense).toFixed(2));
  return summary;
}

module.exports = {
  addTransaction,
  generateReport,
  getLedger,
};

