const crypto = require('crypto');
const PlatformKey = require('../../../models/platformKey.model');

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function createPlatformKey(shopId) {

  const apiKey = generateApiKey();

  const key = await PlatformKey.create({
    shopId,
    apiKey,
    active: true,
  });

  return key;
}

async function validateKey(apiKey) {

  const key = await PlatformKey.findOne({
    apiKey,
    active: true,
  });

  if (!key) {
    throw new Error('INVALID_PLATFORM_KEY');
  }

  return key;
}

module.exports = {
  createPlatformKey,
  validateKey,
};