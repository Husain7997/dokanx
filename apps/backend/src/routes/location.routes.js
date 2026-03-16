const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/location.controller");

router.get("/nearby", controller.searchNearby);
router.get("/", controller.listLocations);

router.use(protect);
router.use(allowRoles("OWNER", "ADMIN", "STAFF"));
router.post("/", controller.createLocation);

module.exports = router;
