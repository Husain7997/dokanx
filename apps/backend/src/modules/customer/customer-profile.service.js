const Order = require("../../models/order.model");
const User = require("../../models/user.model");
const CreditSale = require("../credit-engine/creditSale.model");
const CreditLedger = require("../credit/credit.ledger.model");
const AccountingEntry = require("../wallet-engine/accountingEntry.model");
const WarrantyClaim = require("../warranty-engine/warrantyClaim.model");

function getRole(requestUser) {
  return String(requestUser?.role || "").toUpperCase();
}

function getShopScope(requestUser) {
  return requestUser?.shopId || null;
}

function canAccess(requestUser, profile) {
  if (!requestUser) return false;
  const role = getRole(requestUser);
  if (role === "ADMIN") return true;
  if (role === "CUSTOMER") {
    return requestUser.globalCustomerId === profile.globalCustomerId;
  }
  if (role === "OWNER" || role === "STAFF") {
    return Boolean(getShopScope(requestUser));
  }
  return false;
}

async function getCustomerProfile(globalCustomerId, requestUser) {
  const customer = await User.findOne({ globalCustomerId }).lean();
  if (!customer) throw new Error("Customer not found");
  if (!canAccess(requestUser, customer)) {
    const error = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }

  const [orders, dues, payments, walletEntries, claims] = await Promise.all([
    Order.find({ customerId: customer._id }).sort({ createdAt: -1 }).lean(),
    CreditSale.find({ customerId: globalCustomerId }).sort({ createdAt: -1 }).lean(),
    CreditLedger.find({ customerId: globalCustomerId, type: "PAYMENT_RECEIVED" }).sort({ createdAt: -1 }).lean(),
    AccountingEntry.find({ customerId: globalCustomerId }).sort({ createdAt: -1 }).lean(),
    WarrantyClaim.find({ customerId: globalCustomerId }).sort({ createdAt: -1 }).lean(),
  ]);

  const role = getRole(requestUser);
  const shopScope = String(getShopScope(requestUser) || "");
  const isMerchantScope = role === "OWNER" || role === "STAFF";
  const inScope = (shopId) => !isMerchantScope || String(shopId || "") === shopScope;

  const scopedOrders = orders.filter((order) => inScope(order.shopId || order.shop));
  const scopedDues = dues.filter((sale) => inScope(sale.shopId || sale.shop));
  const scopedPayments = payments.filter((entry) => inScope(entry.shopId || entry.shop));
  const scopedWalletEntries = walletEntries.filter((entry) => inScope(entry.shopId));
  const scopedClaims = claims.filter((claim) => inScope(claim.shopId));

  const walletSummary = scopedWalletEntries.reduce(
    (acc, entry) => {
      if (entry.transactionType === "income") acc.totalIncome += Number(entry.amount || 0);
      if (entry.transactionType === "expense") acc.totalExpense += Number(entry.amount || 0);
      if (String(entry.walletType || "").toUpperCase() === "CREDIT") {
        acc.totalDueSettlements += Number(entry.amount || 0);
      }
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, totalDueSettlements: 0 }
  );

  const totalDue = scopedDues.reduce((sum, sale) => sum + Number(sale.outstandingAmount || 0), 0);

  return {
    customer: {
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      globalCustomerId: customer.globalCustomerId,
    },
    orders: scopedOrders,
    dues: scopedDues,
    payments: scopedPayments,
    claims: scopedClaims,
    walletSummary: {
      ...walletSummary,
      totalDue,
    },
  };
}

module.exports = {
  getCustomerProfile,
};
