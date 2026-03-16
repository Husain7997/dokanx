const router = require("express").Router();
const { protect } = require("../middlewares");
const oauthController = require("../controllers/oauth.controller");

router.get("/authorize", protect, oauthController.authorize);
router.post("/token", oauthController.token);

module.exports = router;
