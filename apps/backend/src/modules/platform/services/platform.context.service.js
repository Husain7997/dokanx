const Shop = require('../../../models/shop.model');

async function buildPlatformContext(platformKey) {

  const shop = await Shop.findById(platformKey.shopId);

  if (!shop) {
    throw new Error('SHOP_NOT_FOUND');
  }

  return {
    shopId: shop._id,
    shop,
  };
}

module.exports = {
  buildPlatformContext,
};