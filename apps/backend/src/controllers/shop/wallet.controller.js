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
        reference: `manual-topup-${Date.now()}`,
      });

    res.json({
      message: t(req.lang, "wallet.topped_up"),
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
      reference: `transfer-${Date.now()}`,
    });

    await walletService.creditWallet({
      shopId: req.body.toShopId,
      amount: req.body.amount,
      reference: `transfer-${Date.now()}`,
    });

    res.json({
      message:
        t(req.lang, "wallet.transfer_success"),
    });

  } catch (err) {
    next(err);
  }
};