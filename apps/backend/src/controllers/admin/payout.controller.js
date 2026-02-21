const { triggerPayout } = require('../../services/payoutGateway.service');
const payoutService = require('../../services/payout.service');
const {
  approvePayout,
  executePayout,
} = require('../../services/payout.service');
const { processPayout } = require('../../services/payout.service');
const Shop = require('../../models/shop.model');
const ShopWallet = require('../../models/ShopWallet');

exports.createShopPayout = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found for owner',
      });
    }

    const wallet = await ShopWallet.findOne({ shop: shop._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    const payout = await processPayout(wallet._id);

    return res.status(200).json({
      success: true,
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

  const payout = await payoutService.createAdminPayout({
    shopId,
    amount,
    adminId: req.user.id,
  });

  res.status(201).json(payout);
};

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




exports.approve = async (req, res) => {
  const payout = await approvePayout(req.params.id, req.user._id);
  res.json(payout);
};

exports.execute = async (req, res) => {
  const payout = await executePayout(
    req.params.id,
    req.headers['idempotency-key']
  );
  res.json(payout);
};

