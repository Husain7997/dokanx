const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    // Primary custom domain for a shop.
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // Default DokanX subdomain, e.g. shop1.dokanx.com => shop1
    subdomain: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // Extra mapped custom domains with verification metadata.
    customDomains: [
      {
        domain: {
          type: String,
          trim: true,
          lowercase: true,
          required: true,
        },
        verifiedAt: {
          type: Date,
          default: null,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        sslStatus: {
          type: String,
          enum: ["PENDING", "ACTIVE", "FAILED"],
          default: "PENDING",
        },
      },
    ],

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ ADD THIS
    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ Future ready
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [90.4125, 23.8103],
      },
      address: {
        type: String,
        default: "",
      },
    },

    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    themeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopTheme",
      default: null,
    },

    themeOverrides: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
);

shopSchema.index({ location: "2dsphere" });
shopSchema.index({ name: 1, status: 1 });
shopSchema.index({ subdomain: 1 }, { sparse: true });
shopSchema.index({ domain: 1 }, { sparse: true });
shopSchema.index({ "customDomains.domain": 1 }, { sparse: true });

module.exports =
  mongoose.models.Shop ||
  mongoose.model("Shop", shopSchema);
