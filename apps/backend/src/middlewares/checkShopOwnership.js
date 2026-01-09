const Shop = require("../models/shop.model");

module.exports = async (req, res, next) => {
  const shopId = req.body.shop || req.params.shopId;

  const shop = await Shop.findById(shopId);

  if (!shop) {
    return res.status(404).json({
      success: false,
      message: "Shop not found",
    });
  }

  if (shop.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Shop ownership mismatch",
    });
  }

  if (!shop.isActive) {
    return res.status(403).json({
      success: false,
      message: "Shop is suspended",
    });
  }

  req.shop = shop;
  next();
};
