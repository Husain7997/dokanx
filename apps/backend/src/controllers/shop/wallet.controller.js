// src/controllers/shop/wallet.controller.js

const walletService =
  require("../../services/wallet.service");
const Ledger =
  require("../../modules/ledger/ledger.model");

const { t } =
  require("@/core/infrastructure");
const walletAdapter =
  require("../../services/wallet/walletAdapter.service");

exports.topupWallet =
async (req, res, next) => {
  try {
    const shopId = req.shop?._id || req.user?.shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    const result =
      await walletService.creditWallet({
        shopId,
        amount: req.body.amount,
        referenceId: req.body.referenceId || req.body.reference || `manual-topup-${Date.now()}`,
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
    const shopId = req.shop?._id || req.user?.shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    await walletService.debitWallet({
      shopId,
      amount: req.body.amount,
      referenceId: req.body.referenceId || req.body.reference || `transfer-${Date.now()}`,
    });

    await walletService.creditWallet({
      shopId: req.body.toShopId,
      amount: req.body.amount,
      referenceId: req.body.referenceId || req.body.reference || `transfer-${Date.now()}`,
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

    const wallet = await walletAdapter.findOneLean({ shopId });
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

exports.listLedger =
async (req, res, next) => {
  try {
    const shopId = req.shop?._id || req.user?.shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const filter = { shopId };
    if (req.query.type) {
      filter.type = String(req.query.type);
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(String(req.query.dateFrom));
      }
      if (req.query.dateTo) {
        filter.createdAt.$lte = new Date(String(req.query.dateTo));
      }
    }

    const entries = await Ledger.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      message: t(req.lang, "wallet.ledger_ready"),
      data: entries,
    });
  } catch (err) {
    next(err);
  }
};

exports.getWalletReport =
async (req, res, next) => {
  try {
    const shopId = req.shop?._id || req.user?.shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Shop context required" });
    }

    const data = await walletService.generateReport({
      shopId,
      customerId: req.query.customerId || undefined,
      dateFrom: req.query.dateFrom || undefined,
      dateTo: req.query.dateTo || undefined,
      type: req.query.type || undefined,
      walletType: req.query.walletType || undefined,
    });

    res.json({
      message: t(req.lang, "wallet.summary_ready"),
      data,
    });
  } catch (err) {
    next(err);
  }
};
