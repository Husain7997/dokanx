const Ledger = require('../models/ledger.model');
const ReconciliationReport = require('../models/ReconciliationReport');
const walletAdapter = require('./wallet/walletAdapter.service');

exports.runDailyReconciliation = async (dateStr) => {
  const ledgerSum = await Ledger.aggregate([
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [
              { $eq: ['$direction', 'CREDIT'] },
              '$amount',
              { $multiply: ['$amount', -1] }
            ]
          }
        }
      }
    }
  ]);

  const walletSum = await walletAdapter.aggregate([
    {
      $group: {
        _id: null,
        balance: { $sum: '$balance' }
      }
    }
  ]);

  const ledgerBalance = ledgerSum[0]?.balance || 0;
  const walletBalance = walletSum[0]?.balance || 0;

  const diff = ledgerBalance - walletBalance;

  await ReconciliationReport.create({
    date: dateStr,
    ledgerBalance,
    walletBalance,
    difference: diff,
    status: diff === 0 ? 'MATCHED' : 'MISMATCH'
  });
};
