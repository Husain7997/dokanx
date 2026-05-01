const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/theme.controller");

router.get("/", controller.listThemes);
router.get("/current", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.getTheme);
router.get("/draft", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.getThemeDraft);
router.get("/history", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.getThemeHistory);
router.get("/media", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.getThemeMedia);
router.post("/media", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.createThemeMedia);
router.delete("/media/:assetId", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.deleteThemeMedia);
router.get("/custom", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.getCustomThemes);
router.get("/custom/:themeId/export", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.exportCustomTheme);
router.post("/custom", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.createCustomTheme);
router.delete("/custom/:themeId", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.deleteCustomTheme);
router.post("/marketplace/install", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.installMarketplaceTheme);
router.post("/marketplace/favorite", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.toggleFavoriteTheme);
router.post("/experiment", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.updateThemeExperiment);
router.post("/rollback", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.rollbackTheme);
router.get("/:merchantId", controller.getTheme);
router.post("/update", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.updateTheme);
router.post("/apply", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.applyTheme);
router.post("/reset", protect, allowRoles("OWNER", "ADMIN", "STAFF"), controller.resetTheme);

module.exports = router;
