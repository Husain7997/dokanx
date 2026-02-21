const { loadConfig } = require('./loadConfig');

loadConfig(); // 🔥 env load once

const env = process.env.NODE_ENV || 'development';

const baseConfig = require('./default');

let envConfig = {};
try {
  envConfig = require(`./${env}`);
} catch (_) {}

module.exports = {
  ...baseConfig,
  ...envConfig,
};
