const Shop = require("../models/shop.model");
const Order = require("../models/order.model");
const automationService = require("@/modules/automation/automation.service");
const webhookDeliveryService = require("@/modules/app-marketplace/webhookDelivery.service");
const courierService = require("@/modules/courier/courier.service");
const Wallet = require("@/models/wallet.model");
const Settlement = require("@/models/settlement.model");
const Ledger = require("@/modules/ledger/ledger.model");

exports.metrics = async (_, res) => {
  const shops = await Shop.countDocuments();
  const orders = await Order.countDocuments();

  res.json({
    shops,
    orders,
  });
};

exports.automationMetrics = async (req, res, next) => {
  try {
    const shopId = String(req.query.shopId || "").trim() || null;
    const data = await automationService.getDashboard({
      shopId,
      limit: req.query.limit || 10,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.operationsMetrics = async (req, res, next) => {
  try {
    const shopId = String(req.query.shopId || "").trim() || null;
    const [automation, deadLetters, courier, courierAnomalies, finance] = await Promise.all([
      shopId ? automationService.getDashboard({ shopId, limit: req.query.limit || 10 }) : null,
      webhookDeliveryService.listDeadLetters({ shopId, limit: req.query.limit || 10 }),
      shopId ? courierService.getCourierDashboard({ shopId, filters: {} }) : null,
      courierService.listCourierAnomalies({ shopId, limit: req.query.limit || 10 }),
      getFinanceSignals(shopId),
    ]);

    res.json({
      data: {
        automation,
        appWebhooks: {
          deadLetterCount: deadLetters.length,
          deadLetters,
        },
        courier: {
          ...(courier || {}),
          anomalies: courierAnomalies,
        },
        finance,
      },
    });
  } catch (err) {
    next(err);
  }
};

async function getFinanceSignals(shopId = null) {
  const walletQuery = shopId ? { shopId } : {};
  const settlementQuery = shopId ? { shopId } : {};
  const ledgerQuery = shopId ? { shopId } : {};

  const [wallets, settlements, ledgerCount] = await Promise.all([
    Wallet.find(walletQuery).lean(),
    Settlement.find(settlementQuery)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Ledger.countDocuments(ledgerQuery),
  ]);

  const walletTotals = wallets.reduce(
    (acc, row) => {
      acc.balance += Number(row.balance || 0);
      acc.withdrawable += Number(row.withdrawable_balance || 0);
      acc.pendingSettlement += Number(row.pending_settlement || 0);
      if (row.status === "FROZEN" || row.isFrozen) acc.frozen += 1;
      return acc;
    },
    { balance: 0, withdrawable: 0, pendingSettlement: 0, frozen: 0 }
  );

  const payoutAlerts = settlements.filter(row => ["PENDING", "FAILED"].includes(String(row.payoutStatus || "").toUpperCase()));
  const anomalies = [];

  if (walletTotals.frozen > 0) {
    anomalies.push({
      type: "FROZEN_WALLETS",
      severity: walletTotals.frozen >= 5 ? "HIGH" : "MEDIUM",
      value: walletTotals.frozen,
      message: `${walletTotals.frozen} wallet(s) are frozen`,
    });
  }

  if (walletTotals.pendingSettlement > 0) {
    anomalies.push({
      type: "PENDING_SETTLEMENT_BALANCE",
      severity: walletTotals.pendingSettlement >= 100000 ? "HIGH" : "MEDIUM",
      value: walletTotals.pendingSettlement,
      message: `Pending settlement balance is ${walletTotals.pendingSettlement}`,
    });
  }

  if (payoutAlerts.length > 0) {
    anomalies.push({
      type: "PAYOUT_ALERTS",
      severity: payoutAlerts.length >= 5 ? "HIGH" : "MEDIUM",
      value: payoutAlerts.length,
      message: `${payoutAlerts.length} payout alert(s) require attention`,
    });
  }

  return {
    ledgerEntries: ledgerCount,
    wallets: {
      count: wallets.length,
      frozen: walletTotals.frozen,
      totalBalance: walletTotals.balance,
      totalWithdrawable: walletTotals.withdrawable,
      totalPendingSettlement: walletTotals.pendingSettlement,
    },
    settlements: {
      count: settlements.length,
      payoutAlertCount: payoutAlerts.length,
      recentPayoutAlerts: payoutAlerts.slice(0, 10),
    },
    anomalies,
  };
}
