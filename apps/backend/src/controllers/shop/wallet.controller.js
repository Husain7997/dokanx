// src/controllers/shop/wallet.controller.js

const walletService =
  require("../../services/wallet.service");

const { t } =
  require("@/core/infrastructure");

exports.topupWallet =
async (req, res, next) => {
  try {

    const result =
      await walletService.creditWallet({
  shopId: req.user._id,
  amount: req.body.amount,
  referenceId: `manual-topup-${Date.now()}`
});

    res.json({
      success: true,
      message: t("wallet.topped_up", req.lang),
      data: result,
    });

  } catch (err) {
    next(err);
  }
};

exports.transferWallet =
async (req, res, next) => {
  try {

    await walletService.debitWallet({
      shopId: req.user._id,
      amount: req.body.amount,
      referenceId: `transfer-${Date.now()}`,
    });

    await walletService.creditWallet({
      shopId: req.body.toShopId,
      amount: req.body.amount,
      referenceId: `transfer-${Date.now()}`,
    });

    res.json({
      success: true,
      message:
        t("wallet.transfer_success", req.lang),
    });

  } catch (err) {
    next(err);
  }
};
