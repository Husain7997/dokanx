const rateLimit = require('express-rate-limit');

/**
 * Global API Rate Limit
 */

module.exports = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});