const walletService = require("../../services/wallet.service");

async function getMyWallet(req, res) {
  const summary = await walletService.getCustomerWalletSummary({
    userId: req.user?._id,
    globalCustomerId: req.user?.globalCustomerId,
  });

  res.json({
    message: "Customer wallet loaded",
    data: summary,
  });
}

module.exports = {
  getMyWallet,
};
