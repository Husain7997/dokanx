const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/theme.controller");

router.get("/", controller.listThemes);
router.post("/apply", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.applyTheme);
router.post("/reset", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.resetTheme);

module.exports = router;
