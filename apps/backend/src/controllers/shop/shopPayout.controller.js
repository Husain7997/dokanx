const payoutService = require('../../services/payout.service');
const Shop = require('../../models/shop.model');

exports.requestPayout = async (req, res) => {
  try {
    const { amount } = req.body;

    let shopId = req.shop?._id;
    if (!shopId && req.user?.id) {
      const shop = await Shop.findOne({ owner: req.user.id });
      shopId = shop?._id;
    }

    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    const payout = await payoutService.createShopPayoutRequest({
      shopId,
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

