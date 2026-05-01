const AWS = require("aws-sdk");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const Media = require("../models/media.model");

// Configure AWS SDK for Cloudflare R2
const s3 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

class MediaService {
  // Generate signed upload URL
  async generateUploadUrl(type, merchantId, fileName, mimeType) {
    const fileExtension = fileName.split(".").pop();
    const key = this.generateFileKey(type, merchantId, fileName);

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
      ACL: "private", // Use signed URLs
      Expires: 3600, // 1 hour
    };

    const uploadUrl = s3.getSignedUrl("putObject", params);
    const fileUrl = `${process.env.CDN_BASE_URL}/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key,
    };
  }

  // Process uploaded image
  async processImage(buffer, type, merchantId, originalFileName) {
    const sizes = this.getSizesForType(type);
    const variants = [];

    // Generate unique ID for the media
    const mediaId = uuidv4();

    for (const size of sizes) {
      const processedBuffer = await sharp(buffer)
        .resize(size.width, size.height, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: this.getQualityForType(type) })
        .toBuffer();

      const key = this.generateVariantKey(mediaId, size.name, originalFileName);
      const variantUrl = `${process.env.CDN_BASE_URL}/${key}`;

      // Upload to R2
      await s3.putObject({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: processedBuffer,
        ContentType: "image/webp",
        ACL: "public-read",
      }).promise();

      variants.push({
        size: size.name,
        url: variantUrl,
        width: size.width,
        height: size.height,
        fileSize: processedBuffer.length,
      });
    }

    return variants;
  }

  // Save media metadata to DB
  async saveMedia(metadata) {
    const media = new Media(metadata);
    return await media.save();
  }

  // Delete media
  async deleteMedia(mediaId, merchantId) {
    const media = await Media.findOne({ _id: mediaId, merchantId });

    if (!media) {
      throw new Error("Media not found");
    }

    try {
      // Delete original file from R2 (if url exists)
      if (media.url) {
        try {
          // Extract key from URL or use stored key
          const key = media.key || this.extractKeyFromUrl(media.url);
          if (key) {
            await s3.deleteObject({
              Bucket: BUCKET_NAME,
              Key: key,
            }).promise();
          }
        } catch (err) {
          console.error("Error deleting original file from R2:", err);
        }
      }

      // Delete variants from R2
      if (media.variants && Array.isArray(media.variants)) {
        for (const variant of media.variants) {
          try {
            if (variant.url) {
              const variantKey = this.extractKeyFromUrl(variant.url);
              if (variantKey) {
                await s3.deleteObject({
                  Bucket: BUCKET_NAME,
                  Key: variantKey,
                }).promise();
              }
            }
          } catch (err) {
            console.error("Error deleting variant from R2:", err);
          }
        }
      }

      // Delete from DB
      await Media.deleteOne({ _id: mediaId });
      
      return true;
    } catch (error) {
      console.error("Error in deleteMedia:", error);
      throw error;
    }
  }

  // List media for merchant
  async listMedia(merchantId, type = null, limit = 50, offset = 0) {
    const query = { merchantId };
    if (type) {
      query.type = type;
    }

    return await Media.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
  }

  // Helper methods
  generateFileKey(type, merchantId, fileName) {
    const timestamp = Date.now();
    const extension = fileName.split(".").pop();
    return `dokanx/merchants/${merchantId}/${type}/${timestamp}-${fileName}`;
  }

  generateVariantKey(mediaId, size, originalFileName) {
    const baseName = originalFileName.replace(/\.[^/.]+$/, "");
    return `dokanx/variants/${mediaId}/${baseName}-${size}.webp`;
  }

  getSizesForType(type) {
    const sizeMap = {
      product: [
        { name: "thumbnail", width: 300, height: 300 },
        { name: "medium", width: 800, height: 800 },
        { name: "large", width: 1200, height: 1200 },
      ],
      banner: [
        { name: "medium", width: 1200, height: 400 },
        { name: "large", width: 1920, height: 640 },
      ],
      logo: [
        { name: "thumbnail", width: 150, height: 150 },
        { name: "medium", width: 300, height: 300 },
      ],
      "rider-proof": [
        { name: "thumbnail", width: 300, height: 300 },
        { name: "medium", width: 800, height: 600 },
      ],
    };

    return sizeMap[type] || [{ name: "medium", width: 800, height: 600 }];
  }

  getQualityForType(type) {
    const qualityMap = {
      product: 80,
      banner: 85,
      logo: 90,
      "rider-proof": 75,
    };

    return qualityMap[type] || 80;
  }

  // Extract S3 key from CDN URL
  extractKeyFromUrl(url) {
    try {
      if (!url) return null;
      
      const cdnBaseUrl = process.env.CDN_BASE_URL;
      if (cdnBaseUrl && url.startsWith(cdnBaseUrl)) {
        // Remove CDN base URL and leading slash
        return url.substring(cdnBaseUrl.length + 1);
      }
      
      // For other URLs, try to extract path
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    } catch (err) {
      console.error("Error extracting key from URL:", err);
      return null;
    }
  }

  // Validate file
  validateFile(file) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
    }

    if (file.size > maxSize) {
      throw new Error("File size too large. Maximum 5MB allowed.");
    }

    return true;
  }

  // Validate input parameters
  validateUploadParams(type, merchantId, fileName, mimeType) {
    const missingFields = [];
    if (!type) missingFields.push("type");
    if (!merchantId) missingFields.push("merchantId");
    if (!fileName) missingFields.push("fileName");
    if (!mimeType) missingFields.push("mimeType");

    if (missingFields.length) {
      if (missingFields.length === 1) {
        throw new Error(`Missing required field: ${missingFields[0]}`);
      }
      throw new Error(`Missing required parameters: ${missingFields.join(", ")}`);
    }

    const allowedTypes = ["product", "banner", "logo", "rider-proof", "kyc", "theme"];
    if (!allowedTypes.includes(type)) {
      throw new Error("Invalid media type");
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error("Invalid MIME type. Allowed: image/jpeg, image/png, image/webp");
    }

    return true;
  }
}

module.exports = new MediaService();