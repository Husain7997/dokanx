module.exports = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const Shop = require('../models/shop.model');
    const shopId = req.headers['x-shop-id'];

    if (!shopId) {
      return res.status(400).json({ message: 'shopId required' });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (shop.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.shop = shop;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
