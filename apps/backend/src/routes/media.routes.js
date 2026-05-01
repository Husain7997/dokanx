const express = require("express");
const router = express.Router();
const multer = require("multer");

const mediaController = require("../controllers/media.controller");
const { protect, allowRoles, requirePermissions } = require("../middlewares");
const checkShopOwnership = require("../middlewares/checkShopOwnership");

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Generate signed upload URL
router.post(
  "/upload-url",
  protect,
  allowRoles("OWNER", "STAFF"),
  requirePermissions("PRODUCT_WRITE"),
  mediaController.generateUploadUrl
);

// Save media metadata after upload to R2
router.post(
  "/",
  protect,
  allowRoles("OWNER", "STAFF"),
  requirePermissions("PRODUCT_WRITE"),
  mediaController.saveMedia
);

// Direct upload and process
router.post(
  "/upload",
  protect,
  allowRoles("OWNER", "STAFF"),
  requirePermissions("PRODUCT_WRITE"),
  upload.single("file"),
  mediaController.uploadAndProcess
);

// List media
router.get(
  "/",
  protect,
  allowRoles("OWNER", "STAFF"),
  mediaController.listMedia
);

// Get media by ID
router.get(
  "/:id",
  protect,
  allowRoles("OWNER", "STAFF"),
  mediaController.getMedia
);

// Delete media
router.delete(
  "/:id",
  protect,
  allowRoles("OWNER", "STAFF"),
  requirePermissions("PRODUCT_WRITE"),
  mediaController.deleteMedia
);

module.exports = router;