const express = require("express");
const router = express.Router();

const {
  createShop,
  updateOrderStatus,
  blockCustomer,
  getMyShops,
  listPublicShops,
  listCustomers,
  createCustomer,
  blockCustomerForMe,
  unblockCustomer,
  listCustomerComplaints,
  createCustomerComplaint,
  updateCustomerComplaint,
} = require('../controllers/shop.controller');

const {
  getShopSettings,
  updateShopSettings,
  getShopPrintCodes,
  listTeamMembers,
  listTeamActivity,
  addTeamMember,
  updateTeamMember,
} = require("../controllers/shop.settings.controller");
const { listShopReviews } = require("../controllers/shop/review.controller");
const { listShopPayments } = require("../controllers/shop/payment.controller");

const { protect, allowRoles } = require("../middlewares");

const canUpdateOrderStatus = (req, res, next) => next();
console.log("protect TYPE:", typeof protect);
console.log("allowRoles TYPE:", typeof allowRoles);
console.log("blockCustomer TYPE:", typeof blockCustomer);

router.put(
  "/:shopId/block-user/:userId",
  protect,
  allowRoles("OWNER"),
  blockCustomer
);

router.get("/public", listPublicShops);

router.get(
  "/me",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  getMyShops
);

router.get(
  "/me/settings",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  getShopSettings
);

router.get(
  "/me/customers",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  listCustomers
);

router.post(
  "/me/customers",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  createCustomer
);

router.patch(
  "/me/customers/:userId/block",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  blockCustomerForMe
);

router.patch(
  "/me/customers/:userId/unblock",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  unblockCustomer
);

router.get(
  "/me/customer-complaints",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  listCustomerComplaints
);

router.post(
  "/me/customer-complaints",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  createCustomerComplaint
);

router.patch(
  "/me/customer-complaints/:complaintId",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  updateCustomerComplaint
);

router.get(
  "/me/reviews",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  listShopReviews
);

router.get(
  "/me/payments",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  listShopPayments
);

router.put(
  "/me/settings",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  updateShopSettings
);

router.get(
  "/me/print-codes",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  getShopPrintCodes
);

router.get(
  "/me/team",
  protect,
  allowRoles("OWNER", "ADMIN"),
  listTeamMembers
);

router.get(
  "/me/team/activity",
  protect,
  allowRoles("OWNER", "ADMIN"),
  listTeamActivity
);

router.post(
  "/me/team",
  protect,
  allowRoles("OWNER", "ADMIN"),
  addTeamMember
);

router.patch(
  "/me/team/:userId",
  protect,
  allowRoles("OWNER", "ADMIN"),
  updateTeamMember
);

router.put(
  "/:id/status",
  protect,
  canUpdateOrderStatus,
  updateOrderStatus
);

router.post(
  "/",
  protect,
  allowRoles("OWNER", "ADMIN"),
  createShop
);

module.exports = router;
