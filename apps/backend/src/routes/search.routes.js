const router = require("express").Router();
const controller = require("../controllers/search.controller");
const { protect, allowRoles } = require("../middlewares");

router.get("/", controller.searchAll);
router.get("/products", controller.searchProducts);
router.get("/shops", controller.searchShops);
router.get("/index", controller.searchIndex);
router.get("/suggestions", controller.searchSuggestions);
router.get("/trending", controller.searchTrending);
router.get("/no-results", protect, allowRoles("ADMIN"), controller.searchNoResults);
router.get("/conversion", protect, allowRoles("ADMIN"), controller.searchConversion);
router.get("/categories", controller.searchCategories);
router.get("/brands", controller.searchBrands);
router.post("/reindex", protect, allowRoles("ADMIN"), controller.rebuildSearchIndex);
router.post("/reindex-delta", protect, allowRoles("ADMIN"), controller.reindexDelta);
router.get("/status", protect, allowRoles("ADMIN"), controller.searchStatus);

module.exports = router;
