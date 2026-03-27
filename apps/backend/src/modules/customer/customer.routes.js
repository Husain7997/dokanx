const router = require("express").Router();
const controller = require("./customer-profile.controller");
const { protect, allowRoles } = require("../../middlewares");

router.get("/:globalCustomerId", protect, allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"), controller.getCustomerProfile);

module.exports = router;
