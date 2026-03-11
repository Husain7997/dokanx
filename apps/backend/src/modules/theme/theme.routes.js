const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const { validateBody, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./theme.controller");
const validator = require("./theme.validator");

router.get("/", protect, allowRoles("ADMIN", "OWNER", "STAFF"), controller.listThemes);
router.post("/", protect, allowRoles("ADMIN"), validateBody(validator.validateThemeBody), controller.createTheme);
router.put("/:themeId", protect, allowRoles("ADMIN"), validateParams(validator.validateIdParam), validateBody(validator.validateThemeBody), controller.updateTheme);
router.delete("/:themeId", protect, allowRoles("ADMIN"), validateParams(validator.validateIdParam), controller.deleteTheme);
router.post("/apply", protect, allowRoles("ADMIN", "OWNER", "STAFF"), validateBody(validator.validateApplyThemeBody), controller.applyTheme);
router.post("/reset", protect, allowRoles("ADMIN", "OWNER", "STAFF"), controller.resetTheme);
router.post("/preview", protect, allowRoles("ADMIN", "OWNER", "STAFF"), validateBody(validator.validateApplyThemeBody), controller.previewTheme);

module.exports = router;
