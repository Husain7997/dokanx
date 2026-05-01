const mongoose = require("mongoose");
const { encryptSecret, decryptSecret } = require("../utils/crypto.util");

function encryptedStringField() {
  return {
    type: String,
    default: null,
    set(value) {
      if (!value) return null;
      if (typeof value === "string" && value.startsWith("enc::")) {
        return value;
      }
      const { cipher, iv } = encryptSecret(String(value));
      return cipher && iv ? `enc::${iv}::${cipher}` : null;
    },
    get(value) {
      if (!value || typeof value !== "string" || !value.startsWith("enc::")) {
        return value;
      }
      const [, iv, cipher] = value.split("::");
      return decryptSecret(cipher, iv);
    },
  };
}

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
    settlementAccountNumber: encryptedStringField(),
    settlementRoutingNumber: encryptedStringField(),
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
    themeId: {
      type: String,
      default: "merchant-theme",
    },
    themeConfig: {
      type: Object,
      default: null,
    },
    themeDraftConfig: {
      type: Object,
      default: null,
    },
    themeDraftUpdatedAt: {
      type: Date,
      default: null,
    },
    themePublishedAt: {
      type: Date,
      default: null,
    },
    themeHistory: {
      type: [
        {
          snapshotId: {
            type: String,
            required: true,
          },
          themeId: {
            type: String,
            required: true,
          },
          config: {
            type: Object,
            default: null,
          },
          mode: {
            type: String,
            enum: ["publish", "rollback"],
            default: "publish",
          },
          sourceSnapshotId: {
            type: String,
            default: null,
          },
          actorName: {
            type: String,
            default: "",
          },
          actorRole: {
            type: String,
            default: "",
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    themeAssets: {
      type: [
        {
          assetId: {
            type: String,
            required: true,
          },
          name: {
            type: String,
            default: "",
          },
          type: {
            type: String,
            enum: ["image"],
            default: "image",
          },
          dataUrl: {
            type: String,
            default: "",
          },
          alt: {
            type: String,
            default: "",
          },
          tags: {
            type: [String],
            default: [],
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    customThemes: {
      type: [
        {
          themeId: {
            type: String,
            required: true,
          },
          name: {
            type: String,
            default: "",
          },
          category: {
            type: String,
            default: "custom",
          },
          plan: {
            type: String,
            default: "ENTERPRISE",
          },
          requiredTier: {
            type: String,
            default: "PLATINUM",
          },
          preview: {
            type: String,
            default: "",
          },
          version: {
            type: String,
            default: "1.0.0",
          },
          versionNotes: {
            type: String,
            default: "",
          },
          approvalStatus: {
            type: String,
            default: "PENDING",
          },
          submittedForReviewAt: {
            type: Date,
            default: Date.now,
          },
          approvedAt: {
            type: Date,
            default: null,
          },
          rejectedAt: {
            type: Date,
            default: null,
          },
          rejectionReason: {
            type: String,
            default: "",
          },
          reviewedByName: {
            type: String,
            default: "",
          },
          marketplaceStatus: {
            type: String,
            default: "PRIVATE",
          },
          marketplaceFeatured: {
            type: Boolean,
            default: false,
          },
          config: {
            type: Object,
            default: null,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    themeMarketplace: {
      type: Object,
      default: () => ({
        installedThemeIds: ["merchant-theme"],
        favoriteThemeIds: [],
      }),
    },
    themeExperiment: {
      type: Object,
      default: () => ({
        isEnabled: false,
        experimentId: "",
        name: "",
        trafficSplit: 50,
        variants: [],
      }),
    },
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
    kycNationalIdNumber: encryptedStringField(),
    kycNationalIdFrontUrl: String,
    kycNationalIdBackUrl: String,
    kycTradeLicenseNumber: encryptedStringField(),
    kycTradeLicenseUrl: String,
  },
  {
    timestamps: true,
    bufferCommands: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

module.exports =
  mongoose.models.Shop ||
  mongoose.model("Shop", shopSchema);

