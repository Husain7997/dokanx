// src/controllers/shop/wallet.controller.js

const walletService =
  require("../../services/wallet.service");

const { t } =
  require("@/core/infrastructure");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || req.user?._id || null;
}

exports.topupWallet =
async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);

    const result =
      await walletService.creditWallet({
  shopId,
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
    const shopId = resolveShopId(req);

    await walletService.debitWallet({
      shopId,
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
