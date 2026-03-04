const {
  createPlatformKey,
} = require('../services/platform.auth.service');

exports.generateKey = async (req, res) => {

  const { shopId } = req.body;

  const key = await createPlatformKey(shopId);

  res.json({
    apiKey: key.apiKey,
  });
};