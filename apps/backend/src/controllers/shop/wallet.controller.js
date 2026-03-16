// src/controllers/shop/wallet.controller.js

const walletService =
  require("../../services/wallet.service");
const ShopWallet =
  require("../../models/ShopWallet");

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

exports.getWalletSummary =
async (req, res, next) => {
  try {
    const shopId = req.shop?._id || req.user?.shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    const wallet = await ShopWallet.findOne({ shopId }).lean();
    if (!wallet) {
      return res.status(404).json({ message: "Shop wallet not found" });
    }

    res.json({
      message: t(req.lang, "wallet.summary_ready"),
      data: wallet,
    });
  } catch (err) {
    next(err);
  }
};
