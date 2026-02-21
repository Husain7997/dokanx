// apps/backend/src/config/env.js

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing required env: ${key}`);
  }
  return value;
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,

  MONGO_URI: requireEnv('MONGO_URI'),

  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  PLATFORM_FEE_PERCENT: Number(process.env.PLATFORM_FEE_PERCENT || 5),
};
