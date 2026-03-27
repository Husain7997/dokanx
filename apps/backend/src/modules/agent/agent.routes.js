const router = require("express").Router();

const controller = require("./agent.controller");
const { protect } = require("../../middlewares");
const allowRoles = require("../../middlewares/allowRoles");

router.post("/register-from-lead", controller.registerFromLead);
router.get("/track-click", controller.trackReferralClick);
router.get("/me", protect, allowRoles("AGENT", "ADMIN"), controller.getMe);

module.exports = router;
