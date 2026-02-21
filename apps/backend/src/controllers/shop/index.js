const express = require('express');
const router = express.Router();

router.use('/', require('./shop.payout.route'));

module.exports = router;
