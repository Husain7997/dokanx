const router = require("express").Router();
const controller = require("./credit.controller");
const { protect, allowRoles } = require("../../middlewares");
const idempotency = require("../../core/idempotency/idempotency.middleware");

router.post("/sales", protect, allowRoles("OWNER", "STAFF", "ADMIN"), controller.createCreditSale);
router.get(
  "/me",
  protect,
  allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"),
  (req, res, next) => {
    const role = String(req.user?.role || "").toUpperCase();
    if (role === "CUSTOMER") {
      return controller.getMyCredit(req, res, next);
    }
    return controller.getShopCreditCustomers(req, res, next);
  }
);
router.get("/customers/:id", protect, allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"), controller.getCustomerDue);
router.get("/shop/customers", protect, allowRoles("OWNER", "STAFF", "ADMIN"), controller.getShopCreditCustomers);
router.post("/limits", protect, allowRoles("OWNER", "STAFF", "ADMIN"), controller.upsertCreditPolicy);
router.post("/payments", protect, idempotency, allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"), controller.payDue);

module.exports = router;
