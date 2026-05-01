const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["product", "banner", "logo", "rider-proof", "kyc", "theme"],
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      index: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    dimensions: {
      width: Number,
      height: Number,
    },
    variants: [{
      size: String, // thumbnail, medium, large
      url: String,
      width: Number,
      height: Number,
      fileSize: Number,
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
mediaSchema.index({ merchantId: 1, type: 1 });
mediaSchema.index({ riderId: 1, type: 1 });

module.exports = mongoose.model("Media", mediaSchema);