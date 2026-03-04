const { t } =
  require('@/core/infrastructure');

exports.getShop = async (req, res) => {

  res.json({
    message: t(req, 'SHOP_FETCHED'),
    shopId: req.platform.shop,
  });
};