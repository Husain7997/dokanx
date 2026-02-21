const Shop = require('../models/shop.model');

module.exports = async function resolveShop(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }

  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) {
    return res.status(403).json({ message: 'Shop not found for owner' });
  }

  req.shop = shop;
  next();
};
