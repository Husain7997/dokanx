const payoutService = require('../../services/payout.service');

exports.requestPayout = async (req, res) => {
  try {
    const { amount } = req.body;

    const payout = await payoutService.createShopPayoutRequest({
      shopId: req.shop._id,
      amount,
      userId: req.user.id,
    });

    res.status(201).json(payout);
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

