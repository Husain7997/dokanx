module.exports = (err, req, res, next) => {
  console.error(err);

  // financial corruption risk
  if (err.code === 'LEDGER_CORRUPTION') {
    process.exit(1);
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal error',
  });
};
