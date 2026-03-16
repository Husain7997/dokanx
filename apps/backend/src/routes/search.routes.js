const router = require("express").Router();
const controller = require("../controllers/search.controller");
const { protect, allowRoles } = require("../middlewares");

router.get("/products", controller.searchProducts);
router.get("/shops", controller.searchShops);
router.get("/index", controller.searchIndex);
router.post("/reindex", protect, allowRoles("ADMIN"), controller.rebuildSearchIndex);

module.exports = router;
