const AccountingEntry = require("../modules/wallet-engine/accountingEntry.model");
const FraudCase = require("../models/fraudCase.model");
const Shop = require("../models/shop.model");
const {
  createReadQuery,
  createReadOneQuery,
} = require("../infrastructure/database/mongo.client");

function scopeOf(entry) {
  return String(entry?.metadata?.scope || "BUSINESS").toUpperCase() === "PERSONAL" ? "PERSONAL" : "BUSINESS";
}

function summarizeRows(rows) {
  return rows.reduce(
    (summary, row) => {
      const transactionType = String(row.transactionType || "expense").toLowerCase();
      const scope = scopeOf(row);
      const amount = Number(row.amount || 0);
      const target = scope === "PERSONAL" ? summary.personal : summary.business;
      if (transactionType === "income") {
        target.income += amount;
      }
      if (transactionType === "expense") {
        target.expense += amount;
      }
      return summary;
    },
    {
      business: { income: 0, expense: 0 },
      personal: { income: 0, expense: 0 },
    },
  );
}

exports.getMerchantFinanceOverview = async (req, res, next) => {
  try {
    const shopId = req.shop?._id || req.user?.shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    const [shop, rows, fraudCases] = await Promise.all([
      createReadOneQuery(Shop, { _id: shopId }).select("name vatRate").lean(),
      createReadQuery(AccountingEntry, { shopId }).sort({ createdAt: -1 }).limit(120).lean(),
      createReadQuery(FraudCase, { shopId }).sort({ updatedAt: -1 }).limit(20).lean(),
    ]);

    const summary = summarizeRows(rows);
    const businessIncome = Number(summary.business.income.toFixed(2));
    const businessExpense = Number(summary.business.expense.toFixed(2));
    const personalIncome = Number(summary.personal.income.toFixed(2));
    const personalExpense = Number(summary.personal.expense.toFixed(2));
    const businessProfit = Number((businessIncome - businessExpense).toFixed(2));
    const personalNet = Number((personalIncome - personalExpense).toFixed(2));
    const vatRate = Number(shop?.vatRate || 0);
    const vatDue = Number(((businessIncome * vatRate) / 100).toFixed(2));
    const openFraudCases = fraudCases.filter((item) => !["CLEARED", "DISMISSED"].includes(String(item.status || "")));
    const highFraudCases = fraudCases.filter((item) => String(item.level || "") === "HIGH");

    res.json({
      data: {
        shop: {
          id: String(shopId),
          name: shop?.name || "Merchant shop",
          vatRate,
        },
        accounting: {
          businessIncome,
          businessExpense,
          businessProfit,
          personalIncome,
          personalExpense,
          personalNet,
        },
        tax: {
          taxableSales: businessIncome,
          deductibleExpense: businessExpense,
          estimatedVatDue: vatDue,
          estimatedNetProfit: businessProfit,
        },
        fraud: {
          totalCases: fraudCases.length,
          openCases: openFraudCases.length,
          highRiskCases: highFraudCases.length,
          alerts: openFraudCases.slice(0, 5).map((item) => ({
            id: String(item._id),
            level: String(item.level || "LOW"),
            status: String(item.status || "OPEN"),
            summary: String(item.summary || "Fraud alert"),
            updatedAt: item.updatedAt,
          })),
        },
        entries: rows.slice(0, 40).map((row) => ({
          id: String(row._id),
          amount: Number(row.amount || 0),
          transactionType: String(row.transactionType || "expense"),
          walletType: String(row.walletType || "CASH"),
          referenceId: String(row.referenceId || ""),
          createdAt: row.createdAt,
          scope: scopeOf(row),
          category: row.metadata?.category || "general",
          note: row.metadata?.note || row.metadata?.source || "",
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createMerchantFinanceEntry = async (req, res, next) => {
  try {
    const shopId = req.shop?._id || req.user?.shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    const amount = Math.abs(Number(req.body?.amount || 0));
    const transactionType = String(req.body?.transactionType || "expense").toLowerCase();
    const scope = String(req.body?.scope || "BUSINESS").toUpperCase() === "PERSONAL" ? "PERSONAL" : "BUSINESS";
    const category = String(req.body?.category || "general").trim() || "general";
    const note = String(req.body?.note || "").trim();
    const walletType = String(req.body?.walletType || "CASH").toUpperCase();

    if (!amount) {
      return res.status(400).json({ message: "amount required" });
    }
    if (!["income", "expense", "transfer", "cheque"].includes(transactionType)) {
      return res.status(400).json({ message: "unsupported transactionType" });
    }

    const direction = transactionType === "income" ? "credit" : "debit";
    const entry = await AccountingEntry.create({
      shopId,
      walletType,
      amount,
      transactionType,
      direction,
      referenceId: req.body?.referenceId || `manual-entry-${Date.now()}`,
      debitAccount: direction === "credit" ? `${scope.toLowerCase()}_receivable` : `${scope.toLowerCase()}_${category}`,
      creditAccount: direction === "credit" ? `${scope.toLowerCase()}_${category}` : `${scope.toLowerCase()}_payable`,
      metadata: {
        source: "merchant_manual_entry",
        scope,
        category,
        note,
      },
    });

    res.status(201).json({
      message: "Finance entry created",
      data: {
        id: String(entry._id),
        amount: Number(entry.amount || 0),
        transactionType: String(entry.transactionType || transactionType),
        walletType: String(entry.walletType || walletType),
        scope,
        category,
        note,
        referenceId: String(entry.referenceId || ""),
      },
    });
  } catch (error) {
    next(error);
  }
};

