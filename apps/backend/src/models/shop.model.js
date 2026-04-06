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
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      default: null,
      index: true,
    },
    acquisitionSource: {
      type: String,
      enum: ["agent", "organic", "ad"],
      default: "organic",
      index: true,
    },
    agentFirstPaymentAt: {
      type: Date,
      default: null,
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
    settlementFrequency: String,
    settlementDelayDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    settlementNotes: String,
    settlementBankName: String,
    settlementAccountName: String,
    settlementAccountNumber: String,
    settlementRoutingNumber: String,
    settlementBranchName: String,
    preferredBankGateway: String,
    logoUrl: String,
    brandPrimaryColor: String,
    brandAccentColor: String,
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    popularityScore: {
      type: Number,
      default: 0,
      min: 0,
    },
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
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    merchantTier: {
      type: String,
      enum: ["STANDARD", "SILVER", "GOLD", "PLATINUM"],
      default: "STANDARD",
      index: true,
    },
    themeId: String,
    themeOverrides: {
      type: Object,
      default: null,
    },
    merchantFeatures: {
      type: Object,
      default: () => ({
        posScannerEnabled: true,
        cameraScannerEnabled: true,
        bluetoothScannerEnabled: true,
        productSearchEnabled: true,
        discountToolsEnabled: true,
        pricingSafetyEnabled: true,
        splitPaymentEnabled: true,
      }),
    },
    pricingSafety: {
      type: Object,
      default: () => ({
        greenMinMarginPct: 0,
        limeMinMarginPct: -2,
        yellowMinMarginPct: -5,
        orangeMinMarginPct: -10,
        redBelowCost: true,
      }),
    },
    kycStatus: {
      type: String,
      enum: ["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"],
      default: "NOT_SUBMITTED",
    },
    kycSubmittedAt: Date,
    kycApprovedAt: Date,
    kycRejectedAt: Date,
    kycRejectionReason: String,
    kycProfilePhotoUrl: String,
    kycNationalIdNumber: String,
    kycNationalIdFrontUrl: String,
    kycNationalIdBackUrl: String,
    kycTradeLicenseNumber: String,
    kycTradeLicenseUrl: String,
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
);

module.exports =
  mongoose.models.Shop ||
  mongoose.model("Shop", shopSchema);

