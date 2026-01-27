
const ShopWallet = require('../../models/ShopWallet');
const mongoose = require('mongoose');

const Settlement = require('../../models/settlement.model');
const FinancePeriod = require('../../models/FinancePeriod');
const Finance = require('../../models/Finance');
/**
 * KPI SUMMARY
 */
exports.kpiSummary = async (req, res) => {
  const [result] = await Settlement.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$grossAmount' },
        totalCommission: { $sum: '$platformFee' },
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
        revenue: { $sum: '$grossAmount' },
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
        revenue: { $sum: '$grossAmount' }
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
    console.error(err);
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
