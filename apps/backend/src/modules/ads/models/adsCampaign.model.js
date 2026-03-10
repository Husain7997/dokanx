const mongoose = require("mongoose");

const platformSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    accountId: { type: String, default: "", trim: true },
    externalCampaignId: { type: String, default: "", trim: true },
    syncStatus: {
      type: String,
      enum: ["NOT_SYNCED", "PENDING", "SYNCED", "FAILED"],
      default: "NOT_SYNCED",
    },
    lastSyncAt: { type: Date, default: null },
    lastError: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const adCampaignSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    objective: {
      type: String,
      enum: ["AWARENESS", "TRAFFIC", "LEADS", "SALES"],
      default: "SALES",
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "QUEUED", "ACTIVE", "PAUSED", "COMPLETED", "FAILED"],
      default: "DRAFT",
      index: true,
    },
    platforms: {
      facebook: { type: platformSchema, default: () => ({}) },
      google: { type: platformSchema, default: () => ({}) },
      youtube: { type: platformSchema, default: () => ({}) },
    },
    budget: {
      daily: { type: Number, default: 0, min: 0 },
      lifetime: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: "BDT", trim: true },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    creative: {
      headline: { type: String, default: "", trim: true, maxlength: 120 },
      primaryText: { type: String, default: "", trim: true, maxlength: 1000 },
      cta: { type: String, default: "BUY_NOW", trim: true, maxlength: 40 },
      landingUrl: { type: String, default: "", trim: true, maxlength: 1000 },
      mediaUrls: {
        type: [String],
        default: [],
      },
    },
    audience: {
      locations: { type: [String], default: [] },
      interests: { type: [String], default: [] },
      ageMin: { type: Number, default: 18, min: 13 },
      ageMax: { type: Number, default: 65, min: 13 },
      gender: {
        type: String,
        enum: ["ALL", "MALE", "FEMALE"],
        default: "ALL",
      },
      frequencyCapPerUserPerDay: {
        type: Number,
        default: 3,
        min: 1,
        max: 30,
      },
    },
    smartBidding: {
      goalType: {
        type: String,
        enum: ["SALES", "LEADS"],
        default: "SALES",
      },
      strategy: {
        type: String,
        enum: ["MAX_CONVERSIONS", "TARGET_CPA", "TARGET_ROAS"],
        default: "MAX_CONVERSIONS",
      },
      targetCpa: {
        type: Number,
        default: 0,
        min: 0,
      },
      targetRoas: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    couponTracking: {
      enabled: { type: Boolean, default: false },
      couponCode: { type: String, default: "", trim: true, maxlength: 64 },
    },
    feedSync: {
      lastSyncedAt: { type: Date, default: null },
      itemCount: { type: Number, default: 0, min: 0 },
      hash: { type: String, default: "", trim: true },
      syncStatus: {
        type: String,
        enum: ["NOT_SYNCED", "SYNCED", "FAILED"],
        default: "NOT_SYNCED",
      },
      lastError: { type: String, default: "", trim: true },
    },
    guardrail: {
      dailySpendLimit: { type: Number, default: 0, min: 0 },
      anomalyThresholdPct: { type: Number, default: 50, min: 1, max: 500 },
    },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
    },
    statusHistory: {
      type: [
        new mongoose.Schema(
          {
            fromStatus: {
              type: String,
              enum: ["DRAFT", "QUEUED", "ACTIVE", "PAUSED", "COMPLETED", "FAILED"],
              required: true,
            },
            toStatus: {
              type: String,
              enum: ["DRAFT", "QUEUED", "ACTIVE", "PAUSED", "COMPLETED", "FAILED"],
              required: true,
            },
            actorUserId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              default: null,
            },
            action: { type: String, default: "", trim: true },
            note: { type: String, default: "", trim: true },
            at: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

adCampaignSchema.index({ shopId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
adCampaignSchema.index({ shopId: 1, status: 1, createdAt: -1 });
adCampaignSchema.index({ shopId: 1, objective: 1, createdAt: -1 });

module.exports =
  mongoose.models.AdCampaign ||
  mongoose.model("AdCampaign", adCampaignSchema);
