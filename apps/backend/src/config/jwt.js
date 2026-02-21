// apps/backend/src/config/jwt.js

const { JWT_SECRET, JWT_EXPIRES_IN } = require('./env');

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
