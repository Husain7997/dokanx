const { triggerPayout } = require('../../infrastructure/payment/payoutGateway.service');
const payoutService = require('../../services/payout.service');
const {
  approvePayout,
  executePayout,
  retryPayout,
  createAdminPayout,
  processPayout,
} = require('../../services/payout.service');
const Shop = require('../../models/shop.model');
const { addJob } = require("@/core/infrastructure");
const walletAdapter = require("../../services/wallet/walletAdapter.service");

exports.createShopPayout = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found for owner',
      });
    }

    const wallet = await walletAdapter.findOne({ shopId: shop._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    const payout = await processPayout({ shopId: shop._id });

await addJob("settlement", { walletId: wallet._id });

    return res.status(200).json({
      message: t('common.updated', req.lang),
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
  try {
    const { shopId, amount } = req.body;

    const payout = await payoutService.createAdminPayout({
      shopId,
      amount,
      adminId: req.user.id,
    });

    return res.status(201).json(payout);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.manualPayout = async (req, res) => {
  try {
    const { walletId, amount, type, referenceId } = req.body;

    const ledgerEntry = await triggerPayout({
      walletId,
      amount,
      type,
      referenceId,
      idempotencyKey: `${referenceId}_${type}`
    });

    return res.json({ message: 'Payout triggered', data: ledgerEntry });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.retryPayout = async (req, res) => {
  const payoutId = req.params.id;
  try {
    const payout = await retryPayout(payoutId);
    return res.json(payout);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.approve = async (req, res) => {
  try {
    const payout = await approvePayout(req.params.id, req.user._id);
    return res.json(payout);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
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
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

