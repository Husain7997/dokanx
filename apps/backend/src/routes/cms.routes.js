const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/cms.controller");

router.get("/pages/:slug", controller.getPageBySlug);

router.use(protect);
router.use(allowRoles("OWNER", "ADMIN", "STAFF"));

router.get("/pages", controller.listPages);
router.post("/pages", controller.createPage);
router.patch("/pages/:pageId", controller.updatePage);

module.exports = router;
