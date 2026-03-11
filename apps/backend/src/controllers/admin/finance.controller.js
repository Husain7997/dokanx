
const ShopWallet = require('../../models/ShopWallet');
const mongoose = require('mongoose');

const Settlement = require('../../models/settlement.model');
const FinancePeriod = require('../../models/FinancePeriod');
const Finance = require('../../models/Finance');
const Ledger = require('@/modules/ledger/ledger.model');
const platformCommissionReport = require("@/modules/billing/platformCommissionReport.service");
const { logger } = require("@/core/infrastructure");
/**
 * KPI SUMMARY
 */
exports.kpiSummary = async (req, res) => {
  const [result] = await Settlement.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalCommission: { $sum: '$commission' },
        totalPayout: { $sum: '$netPayout' },
        totalSettlements: { $sum: 1 }
      }
    }
  ]);

  res.json({ data: result || {} });
};

/**
 * REVENUE vs PAYOUT (daily)
 */
exports.revenueVsPayout = async (req, res) => {
  const data = await Settlement.aggregate([
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        revenue: { $sum: '$totalAmount' },
        payout: { $sum: '$netPayout' }
      }
    },
    { $sort: { '_id.day': 1 } }
  ]);

  res.json({ data });
};

/**
 * TOP SHOPS
 */
exports.topShops = async (req, res) => {
  const data = await Settlement.aggregate([
    {
      $group: {
        _id: '$shopId',
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 }
  ]);

  res.json({ data });
};

/**
 * LOCK FINANCE PERIOD
 */
exports.lockFinancePeriod = async (req, res) => {
  const { period } = req.body;

  const financePeriod = await FinancePeriod.findOne({ period });
  if (!financePeriod)
    return res.status(404).json({ message: 'Period not found' });

  financePeriod.locked = true;
  financePeriod.lockedAt = new Date();
  financePeriod.lockedBy = req.user?._id;

  await financePeriod.save();

  res.json({ message: 'Finance period locked', financePeriod });
};


exports.listFinances = async (req, res) => {
  try {
    const finances = await Finance.find().sort({ createdAt: -1 });
    res.json({ data: finances });
  } catch (err) {
    logger.error({ err: err.message }, "List finances failed");
    res.status(500).json({ error: err.message });
  }
};

exports.settleFinance = async (req, res) => {
  try {
    // example: mark finance as settled
    const { financeId } = req.body;
    const finance = await Finance.findById(financeId);
    if (!finance) return res.status(404).json({ message: "Finance record not found" });

    finance.status = "SETTLED";
    await finance.save();

    res.json({ message: "Finance settled", finance });
  } catch (err) {
    logger.error({ err: err.message }, "Settle finance failed");
    res.status(500).json({ error: err.message });
  }
};

/**
 * PENDING / FAILED PAYOUTS
 */
exports.payoutAlerts = async (req, res) => {
  const data = await Settlement.find({
    payoutStatus: { $in: ['PENDING', 'FAILED'] }
  }).sort({ createdAt: -1 });

  res.json({ data });
};


const { toCSV } = require('../../utils/csv.util');

exports.exportSettlementsCSV = async (req, res) => {
  const settlements = await Settlement.find().lean();

  const csv = toCSV(settlements);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="settlements.csv"'
  );

  res.send(csv);
};

exports.platformCommissionSummary = async (req, res) => {
  try {
    const result = await platformCommissionReport.getCommissionReconciliation({
      from: req.query.from || null,
      to: req.query.to || null,
    });

    res.json({
      data: {
        settlementCommission: result.settlementCommission,
        merchantDirectCount: result.merchantDirectCount,
        platformWalletCount: Math.max(0, result.settlementCount - result.merchantDirectCount),
        ledgerCommission: result.ledgerCommission,
        ledgerRecords: result.ledgerEntries,
        difference: result.difference,
        status: result.status,
      }
    });
  } catch (err) {
    logger.error({ err: err.message }, "Platform commission summary failed");
    res.status(500).json({ error: err.message });
  }
};

exports.platformCommissionEntries = async (req, res) => {
  try {
    const data = await platformCommissionReport.listCommissionEntries({
      from: req.query.from || null,
      to: req.query.to || null,
      limit: req.query.limit || 50,
    });

    res.json({ data });
  } catch (err) {
    logger.error({ err: err.message }, "Platform commission entries failed");
    res.status(500).json({ error: err.message });
  }
};

exports.exportPlatformCommissionCSV = async (req, res) => {
  try {
    const rows = await platformCommissionReport.buildCommissionExportRows({
      from: req.query.from || null,
      to: req.query.to || null,
      limit: req.query.limit || 1000,
    });

    const csv = toCSV(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="platform-commission.csv"'
    );
    res.send(csv);
  } catch (err) {
    logger.error({ err: err.message }, "Platform commission export failed");
    res.status(500).json({ error: err.message });
  }
};
