const router = require("express").Router();
const {protect} = require("../middlewares");
const { validateBody } = require("../middlewares/validateRequest");
const validator = require("../validators/me.validator");

const { getMe, updatePreferences } = require("../controllers/me.controller");

router.get("/me", protect, getMe);
router.put("/me/preferences", protect, validateBody(validator.validatePreferencesBody), updatePreferences);

module.exports = router;
