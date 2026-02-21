
const router = require('express').Router();
const { protect } = require('../middlewares/auth.middleware');
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});
