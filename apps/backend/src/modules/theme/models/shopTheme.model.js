const mongoose = require("mongoose");

const shopThemeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      unique: true,
      sparse: true,
    },
    category: {
      type: String,
      enum: ["PHARMACY", "FASHION", "GROCERY", "ELECTRONICS", "RESTAURANT", "JEWELRY", "BOOKSTORE", "HARDWARE", "CUSTOM"],
      default: "CUSTOM",
    },
    isPreset: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tokens: {
      primaryColor: { type: String, default: "#0EA5E9" },
      secondaryColor: { type: String, default: "#111827" },
      accentColor: { type: String, default: "#F59E0B" },
      fontFamily: { type: String, default: "Inter" },
      borderRadius: { type: String, enum: ["SHARP", "ROUNDED", "PILL"], default: "ROUNDED" },
      spacing: { type: String, enum: ["COMPACT", "BALANCED", "SPACIOUS"], default: "BALANCED" },
    },
    assets: {
      logoUrl: { type: String, default: "" },
      bannerUrls: { type: [String], default: [] },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ShopTheme || mongoose.model("ShopTheme", shopThemeSchema);
