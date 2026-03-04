const router = require('express').Router();

const platformRoutes =
  require('../modules/platform');

/**
 * API VERSIONING
 */

router.use('/v1/platform', platformRoutes);

module.exports = router;