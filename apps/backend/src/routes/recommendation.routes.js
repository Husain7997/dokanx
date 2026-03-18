const router = require("express").Router();
const controller = require("../controllers/recommendation.controller");
const optionalAuth = require("../middlewares/optionalAuth.middleware");

router.get("/home", optionalAuth, controller.getHomeRecommendations);
router.get("/product/:id", optionalAuth, controller.getProductRecommendations);
router.get("/shop/:id", optionalAuth, controller.getShopRecommendations);
router.get("/trending", controller.getTrendingRecommendations);

module.exports = router;
