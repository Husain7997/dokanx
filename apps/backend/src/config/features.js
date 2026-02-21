module.exports = {
  payments: process.env.FEATURE_PAYMENTS !== 'off',
  settlement: process.env.FEATURE_SETTLEMENT !== 'off',
  payout: process.env.FEATURE_PAYOUT !== 'off',
};
