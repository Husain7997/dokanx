const mongoose = require('mongoose');
const Shop = require('../models/shop.model');

module.exports = async (req, res, next) => {
  try {
    const shopId = req.headers['x-shop-id'];

    // console.log('RAW SHOP ID:', shopId);

    if (!shopId) {
      return res.status(400).json({ message: 'x-shop-id header missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ message: 'Invalid shopId format' });
    }

    const shop = await Shop.findById(shopId);

    // console.log('FOUND SHOP:', shop);

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    req.shop = shop;
    next();
  } catch (err) {
    console.error('TENANT ERROR:', err);
    return res.status(500).json({ message: 'Tenant middleware failed' });
  }
};
