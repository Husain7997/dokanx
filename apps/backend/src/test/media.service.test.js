const mediaService = require("../services/media.service");

describe("Media Service Validation", () => {
  describe("validateUploadParams", () => {
    test("should validate valid parameters", () => {
      const validParams = {
        type: "product",
        merchantId: "507f1f77bcf86cd799439011",
        fileName: "test.jpg",
        mimeType: "image/jpeg"
      };

      expect(() => {
        mediaService.validateUploadParams(
          validParams.type,
          validParams.merchantId,
          validParams.fileName,
          validParams.mimeType
        );
      }).not.toThrow();
    });

    test("should throw error for invalid type", () => {
      expect(() => {
        mediaService.validateUploadParams(
          "invalid-type",
          "507f1f77bcf86cd799439011",
          "test.jpg",
          "image/jpeg"
        );
      }).toThrow("Invalid media type");
    });

    test("should throw error for missing merchantId", () => {
      expect(() => {
        mediaService.validateUploadParams(
          "product",
          null,
          "test.jpg",
          "image/jpeg"
        );
      }).toThrow("Missing required field: merchantId");
    });
  });

  describe("validateFile", () => {
    test("should validate valid file", () => {
      const validFile = {
        size: 1024 * 1024, // 1MB
        mimetype: "image/jpeg"
      };

      expect(() => {
        mediaService.validateFile(validFile);
      }).not.toThrow();
    });

    test("should throw error for file too large", () => {
      const largeFile = {
        size: 10 * 1024 * 1024, // 10MB
        mimetype: "image/jpeg"
      };

      expect(() => {
        mediaService.validateFile(largeFile);
      }).toThrow("File size too large");
    });

    test("should throw error for invalid mime type", () => {
      const invalidFile = {
        size: 1024 * 1024,
        mimetype: "text/plain"
      };

      expect(() => {
        mediaService.validateFile(invalidFile);
      }).toThrow("Invalid file type");
    });
  });

  describe("getSizesForType", () => {
    test("should return correct sizes for product", () => {
      const sizes = mediaService.getSizesForType("product");
      expect(sizes).toEqual([
        { name: "thumbnail", width: 300, height: 300 },
        { name: "medium", width: 800, height: 800 },
        { name: "large", width: 1200, height: 1200 },
      ]);
    });

    test("should return correct sizes for banner", () => {
      const sizes = mediaService.getSizesForType("banner");
      expect(sizes).toEqual([
        { name: "medium", width: 1200, height: 400 },
        { name: "large", width: 1920, height: 640 },
      ]);
    });
  });

  describe("extractKeyFromUrl", () => {
    test("should extract key from Cloudflare URL", () => {
      const url = "https://cdn.example.com/media/uploads/507f1f77bcf86cd799439011/product/test-uuid.webp";
      const key = mediaService.extractKeyFromUrl(url);
      expect(key).toBe("media/uploads/507f1f77bcf86cd799439011/product/test-uuid.webp");
    });
  });
});