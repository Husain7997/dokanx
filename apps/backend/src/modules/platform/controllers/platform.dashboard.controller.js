const ShopDashboard =
  require('../../../projections/readModels/shopDashboard.readModel');

exports.getDashboard = async (req, res) => {

  const { shopId } = req.platform;

  const dashboard =
    await ShopDashboard.findOne({ shopId });

  res.json(dashboard);
};