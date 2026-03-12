const mongoose = require("mongoose");

const appSchema = new mongoose.Schema(
  {
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceDeveloper",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["MARKETING", "ANALYTICS", "INTEGRATION", "UTILITY"],
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    permissions: {
      type: [String],
      default: [],
    },
    webhookEvents: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "SUSPENDED"],
      default: "DRAFT",
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    pricing: {
      type: {
        model: {
          type: String,
          enum: ["FREE", "MONTHLY", "USAGE"],
          default: "FREE",
        },
        amount: {
          type: Number,
          default: 0,
          min: 0,
        },
        currency: {
          type: String,
          default: "BDT",
          trim: true,
          uppercase: true,
        },
      },
      default: () => ({}),
    },
    oauth: {
      clientId: {
        type: String,
        required: true,
        index: true,
      },
      clientSecretHash: {
        type: String,
        required: true,
        select: false,
      },
      redirectUris: {
        type: [String],
        default: [],
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

appSchema.index({ slug: 1 }, { unique: true });
appSchema.index({ status: 1, type: 1, isPublic: 1 });

module.exports =
  mongoose.models.MarketplaceApp ||
  mongoose.model("MarketplaceApp", appSchema);
