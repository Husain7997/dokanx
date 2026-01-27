const { triggerPayout } = require('../../services/payoutGateway.service');

exports.manualPayout = async (req, res) => {
  const { walletId, amount, type, referenceId } = req.body;

  const ledgerEntry = await triggerPayout({
    walletId,
    amount,
    type,
    referenceId,
    idempotencyKey: `${referenceId}_${type}`
  });

  res.json({ message: 'Payout triggered', data: ledgerEntry });
};

exports.retryPayout = async (req, res) => {
  const { walletId, amount, type, referenceId } = req.body;

  const ledgerEntry = await triggerPayout({
    walletId,
    amount,
    type,
    referenceId,
    idempotencyKey: `${referenceId}_${type}`
  });

  res.json({ message: 'Retry triggered', data: ledgerEntry });
};
