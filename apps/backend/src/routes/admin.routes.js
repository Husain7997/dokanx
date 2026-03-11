const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../middlewares");

const adminController = require("../controllers/admin.controller");
const systemController = require("../controllers/admin/system.controller");

// ❗❗ খুব গুরুত্বপূর্ণ: function হিসেবে পাঠাচ্ছি
router.get("/users",
  protect,
  allowRoles("admin"),
  adminController.getAllUsers
);

router.put("/users/:id/block",
  protect,
  allowRoles("admin"),
  adminController.blockUser
);
router.put("/users/:id/unblock",
  protect,
  allowRoles("admin"),
  adminController.unblockUser
);

router.put("/shops/:id/approve",
  protect,
  allowRoles("admin"),
  adminController.approveShop
);

router.put("/shops/:id/suspend",
  protect,
  allowRoles("admin"),
  adminController.suspendShop
);

router.get("/orders",
  protect,
  allowRoles("admin"),
  adminController.getAllOrders
);

router.get("/audit-logs",
  protect,
  allowRoles("admin"),
  adminController.getAuditLogs
);

router.get("/system/panic-mode",
  protect,
  allowRoles("admin"),
  systemController.getPanicMode
);

router.put("/system/panic-mode",
  protect,
  allowRoles("admin"),
  systemController.updatePanicMode
);

module.exports = router;
