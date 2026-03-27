const router = require("express").Router();
const { protect } = require("../middlewares");

const { getMe, updatePreferences } = require("../controllers/me.controller");

router.get("/me", protect, getMe);
router.put("/me/preferences", protect, updatePreferences);

module.exports = router;
