const mongoose = require("mongoose");

const adsCampaignMetricSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdCampaign",
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    spend: {
      type: Number,
      default: 0,
      min: 0,
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },
    reach: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    conversions: {
      type: Number,
      default: 0,
      min: 0,
    },
    revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

adsCampaignMetricSchema.index({ campaignId: 1, dateKey: 1 }, { unique: true });
adsCampaignMetricSchema.index({ shopId: 1, dateKey: -1 });

module.exports =
  mongoose.models.AdsCampaignMetric ||
  mongoose.model("AdsCampaignMetric", adsCampaignMetricSchema);
