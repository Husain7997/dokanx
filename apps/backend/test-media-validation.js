const mediaService = require("./src/services/media.service");

console.log("Testing Media Service Validation Functions...");

// Test validateUploadParams
try {
  console.log("\n1. Testing validateUploadParams with valid params...");
  mediaService.validateUploadParams("product", "507f1f77bcf86cd799439011", "test.jpg", "image/jpeg");
  console.log("✓ Valid params passed");

  console.log("\n2. Testing validateUploadParams with invalid type...");
  try {
    mediaService.validateUploadParams("invalid-type", "507f1f77bcf86cd799439011", "test.jpg", "image/jpeg");
  } catch (error) {
    console.log("✓ Invalid type correctly rejected:", error.message);
  }

  console.log("\n3. Testing validateUploadParams with missing merchantId...");
  try {
    mediaService.validateUploadParams("product", null, "test.jpg", "image/jpeg");
  } catch (error) {
    console.log("✓ Missing merchantId correctly rejected:", error.message);
  }
} catch (error) {
  console.error("Error in validateUploadParams tests:", error);
}

// Test validateFile
try {
  console.log("\n4. Testing validateFile with valid file...");
  const validFile = { size: 1024 * 1024, mimetype: "image/jpeg" };
  mediaService.validateFile(validFile);
  console.log("✓ Valid file passed");

  console.log("\n5. Testing validateFile with large file...");
  try {
    const largeFile = { size: 10 * 1024 * 1024, mimetype: "image/jpeg" };
    mediaService.validateFile(largeFile);
  } catch (error) {
    console.log("✓ Large file correctly rejected:", error.message);
  }

  console.log("\n6. Testing validateFile with invalid mime type...");
  try {
    const invalidFile = { size: 1024 * 1024, mimetype: "text/plain" };
    mediaService.validateFile(invalidFile);
  } catch (error) {
    console.log("✓ Invalid mime type correctly rejected:", error.message);
  }
} catch (error) {
  console.error("Error in validateFile tests:", error);
}

// Test getSizesForType
try {
  console.log("\n7. Testing getSizesForType...");
  const productSizes = mediaService.getSizesForType("product");
  console.log("✓ Product sizes:", productSizes);

  const bannerSizes = mediaService.getSizesForType("banner");
  console.log("✓ Banner sizes:", bannerSizes);
} catch (error) {
  console.error("Error in getSizesForType tests:", error);
}

// Test extractKeyFromUrl
try {
  console.log("\n8. Testing extractKeyFromUrl...");
  const url = "https://cdn.example.com/media/uploads/507f1f77bcf86cd799439011/product/test-uuid.webp";
  const key = mediaService.extractKeyFromUrl(url);
  console.log("✓ Extracted key:", key);
} catch (error) {
  console.error("Error in extractKeyFromUrl tests:", error);
}

console.log("\n✅ All validation tests completed!");