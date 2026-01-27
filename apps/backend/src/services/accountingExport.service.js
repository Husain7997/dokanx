const Ledger = require('../models/ledger.model');
const AccountingExport = require('../models/AccountingExport');
const crypto = require('crypto');

exports.exportPeriod = async ({ period, target, actorId }) => {
  // idempotency check
  const exists = await AccountingExport.findOne({ period, target });
  if (exists) {
    throw new Error('Already exported for this period');
  }

  const start = new Date(`${period}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const entries = await Ledger.find({
    createdAt: { $gte: start, $lt: end }
  }).lean();

  const journals = entries.map(e => ({
    date: e.createdAt.toISOString().slice(0, 10),
    account:
      e.type === 'PLATFORM_FEE'
        ? 'Platform Commission'
        : e.type === 'REFUND'
        ? 'Refund'
        : 'Shop Payable',
    debit: e.direction === 'DEBIT' ? e.amount : 0,
    credit: e.direction === 'CREDIT' ? e.amount : 0,
    reference: e._id.toString()
  }));

  const payload = JSON.stringify(journals);
  const checksum = crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex');

  await AccountingExport.create({
    period,
    target,
    recordCount: journals.length,
    checksum,
    exportedBy: actorId
  });

  return journals;
};
