const {
  validateKey,
} = require('../services/platform.auth.service');

const {
  buildPlatformContext,
} = require('../services/platform.context.service');

async function platformAuth(req, res, next) {

  try {

    const apiKey = req.headers['x-platform-key'];

    if (!apiKey) {
      return res.status(401).json({
        message: 'PLATFORM_KEY_REQUIRED',
      });
    }

    const key = await validateKey(apiKey);

    const context = await buildPlatformContext(key);

    req.platform = context;

    next();

  } catch (err) {
    next(err);
  }
}

module.exports = platformAuth;