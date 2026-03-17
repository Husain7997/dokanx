const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    domain: String,
    slug: String,

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
    supportEmail: String,
    whatsapp: String,
    payoutSchedule: String,
    logoUrl: String,
    brandPrimaryColor: String,
    brandAccentColor: String,
    storefrontDomain: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    country: String,
    vatRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    defaultDiscountRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    themeId: String,
    themeOverrides: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
);

module.exports =
  mongoose.models.Shop ||
  mongoose.model("Shop", shopSchema);
