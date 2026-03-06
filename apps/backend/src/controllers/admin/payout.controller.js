const {
  processPayout,
  retryFailedPayout,
  createAdminPayout: createAdminPayoutService,
  approvePayout,
  executePayout
} = require('../../services/payout.service');
const Shop = require('../../models/shop.model');
const ShopWallet = require('../../models/ShopWallet');
const { addJob } = require("@/core/infrastructure");

exports.createShopPayout = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found for owner',
      });
    }

    const wallet = await ShopWallet.findOne({ shopId: shop._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    const payout = await processPayout({ shopId: shop._id });

    await addJob("settlement", { shopId: shop._id });

    return res.status(200).json({
      message: "Payout processed",
      data: payout,
    });
  } catch (err) {
    console.error('PAYOUT ERROR:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Payout failed',
    });
  }
};

exports.createAdminPayout = async (req, res) => {
  const { shopId, amount } = req.body;

  const payout = await createAdminPayoutService({
    shopId,
    amount,
    adminId: req.user.id,
  });

  res.status(201).json(payout);
};

exports.manualPayout = async (req, res) => {
  const { shopId } = req.body;
  if (!shopId) {
    return res.status(400).json({ message: "shopId is required" });
  }

  const payout = await processPayout({
    shopId
  });

  res.json({ message: 'Payout triggered', data: payout });
};

exports.retryPayout = async (req, res) => {
  try {
    const { shopId } = req.body;
    if (!shopId) {
      return res.status(400).json({ message: "shopId is required" });
    }

    const payout = await retryFailedPayout(shopId);
    return res.json({ message: 'Retry triggered', data: payout });
  } catch (err) {
    return res.status(400).json({
      message: err.message || "Retry failed",
    });
  }
};

exports.approve = async (req, res) => {
  try {
    const payout = await approvePayout(req.params.id, req.user._id);
    return res.json(payout);
  } catch (err) {
    return res.status(400).json({
      message: err.message || "Approve failed",
    });
  }
};

exports.execute = async (req, res) => {
  try {
    const payout = await executePayout(
      req.params.id,
      req.headers['idempotency-key']
    );
    return res.json(payout);
  } catch (err) {
    return res.status(400).json({
      message: err.message || "Execute failed",
    });
  }
};

