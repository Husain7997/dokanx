const router = require("express").Router();
const multer = require("multer");

const { protect } = require("@/middlewares");
const role = require("@/middlewares/role.middleware");
const checkShopOwnership = require("@/middlewares/checkShopOwnership");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const controller = require("./catalogImport.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.post(
  "/import-excel/upload",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  upload.single("file"),
  controller.uploadExcel
);

router.get(
  "/import-excel/preview/:batchId",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  controller.previewImport
);

router.post(
  "/import-excel/confirm/:batchId",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  controller.confirmImport
);

router.get(
  "/import-excel/errors/:batchId",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  controller.errorReport
);

module.exports = router;
