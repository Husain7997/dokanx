const mediaService = require("../services/media.service");
const { successResponse, errorResponse } = require("../utils/response.utils");

class MediaController {
  // Generate upload URL
  async generateUploadUrl(req, res) {
    try {
      const { type, fileName, mimeType } = req.body;
      const merchantId = req.user.shopId || req.params.merchantId;

      // Validate parameters
      if (!type || !fileName || !mimeType) {
        return errorResponse(res, "Missing required fields: type, fileName, mimeType", 400);
      }

      // Use service validation
      mediaService.validateUploadParams(type, merchantId, fileName, mimeType);

      const result = await mediaService.generateUploadUrl(type, merchantId, fileName, mimeType);

      successResponse(res, "Upload URL generated successfully", result, 200);
    } catch (error) {
      console.error("Error generating upload URL:", error);
      const statusCode = error.message.includes("Invalid") ? 400 : 500;
      errorResponse(res, error.message || "Failed to generate upload URL", statusCode);
    }
  }

  // Handle direct upload and processing
  async uploadAndProcess(req, res) {
    try {
      const { type } = req.body;
      const merchantId = req.user.shopId;
      const file = req.file;

      if (!file) {
        return errorResponse(res, "No file uploaded", 400);
      }

      if (!type) {
        return errorResponse(res, "Missing required field: type", 400);
      }

      // Validate file
      mediaService.validateFile(file);
      mediaService.validateUploadParams(type, merchantId, file.originalname, file.mimetype);

      // Process image and get variants
      const variants = await mediaService.processImage(file.buffer, type, merchantId, file.originalname);

      // Save metadata
      const mediaData = {
        url: variants.find(v => v.size === "medium")?.url || variants[0]?.url,
        type,
        merchantId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        dimensions: {
          width: 0,
          height: 0,
        },
        variants,
      };

      const media = await mediaService.saveMedia(mediaData);

      successResponse(res, "Media uploaded and processed successfully", {
        media,
        variants,
      }, 200);
    } catch (error) {
      console.error("Error uploading media:", error);
      const statusCode = error.message.includes("Invalid") || error.message.includes("Missing") || error.message.includes("too large") ? 400 : 500;
      errorResponse(res, error.message || "Failed to upload media", statusCode);
    }
  }

  // Delete media
  async deleteMedia(req, res) {
    try {
      const { id } = req.params;
      const merchantId = req.user.shopId;

      if (!id) {
        return errorResponse(res, "Missing required parameter: id", 400);
      }

      await mediaService.deleteMedia(id, merchantId);

      successResponse(res, "Media deleted successfully");
    } catch (error) {
      console.error("Error deleting media:", error);
      const statusCode = error.message.includes("not found") || error.message.includes("Invalid") ? 404 : 500;
      errorResponse(res, error.message || "Failed to delete media", statusCode);
    }
  }

  // List media
  async listMedia(req, res) {
    try {
      const { type, limit = 50, offset = 0 } = req.query;
      const merchantId = req.user.shopId;

      // Validate limit and offset
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return errorResponse(res, "Limit must be a number between 1 and 100", 400);
      }

      if (isNaN(offsetNum) || offsetNum < 0) {
        return errorResponse(res, "Offset must be a non-negative number", 400);
      }

      // Validate type if provided
      if (type && !["product", "banner", "logo", "rider-proof", "kyc", "theme"].includes(type)) {
        return errorResponse(res, "Invalid type parameter", 400);
      }

      const media = await mediaService.listMedia(merchantId, type, limitNum, offsetNum);

      successResponse(res, "Media retrieved successfully", { media });
    } catch (error) {
      console.error("Error listing media:", error);
      errorResponse(res, "Failed to retrieve media", 500);
    }
  }

  // Get media by ID
  async getMedia(req, res) {
    try {
      const { id } = req.params;
      const merchantId = req.user.shopId;

      if (!id) {
        return errorResponse(res, "Missing required parameter: id", 400);
      }

      const media = await require("../models/media.model").findOne({
        _id: id,
        merchantId,
      });

      if (!media) {
        return errorResponse(res, "Media not found", 404);
      }

      successResponse(res, "Media retrieved successfully", { media });
    } catch (error) {
      console.error("Error getting media:", error);
      const statusCode = error.message.includes("not found") ? 404 : 500;
      errorResponse(res, error.message || "Failed to retrieve media", statusCode);
    }
  }

  // Save media metadata after upload to R2
  async saveMedia(req, res) {
    try {
      const { type, fileName, fileUrl, key, fileSize, mimeType } = req.body;
      const merchantId = req.user.shopId;

      if (!type || !fileName || !fileUrl) {
        return errorResponse(res, "Missing required fields: type, fileName, fileUrl", 400);
      }

      // Validate parameters
      mediaService.validateUploadParams(type, merchantId, fileName, mimeType || "image/webp");

      const mediaData = {
        url: fileUrl,
        type,
        merchantId,
        fileName,
        fileSize: fileSize || 0,
        mimeType: mimeType || "image/webp",
        key,
        variants: [], // Can be populated if needed
      };

      const media = await mediaService.saveMedia(mediaData);

      successResponse(res, "Media saved successfully", media);
    } catch (error) {
      console.error("Error saving media:", error);
      const statusCode = error.message.includes("Invalid") || error.message.includes("Missing") || error.message.includes("required") ? 400 : 500;
      errorResponse(res, error.message || "Failed to save media", statusCode);
    }
  }
}

module.exports = new MediaController();