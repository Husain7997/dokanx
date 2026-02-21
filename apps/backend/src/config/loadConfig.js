
const dotenv = require('dotenv');
const path = require('path');

function loadConfig() {
  const env = process.env.NODE_ENV || 'development';

  const envFile =
    env === 'test'
      ? '.env.test'
      : '.env';

  dotenv.config({
    path: path.resolve(process.cwd(), envFile),
  });

  console.log(`🔧 Config loaded (${env})`);
}

module.exports = {
  loadConfig,
};