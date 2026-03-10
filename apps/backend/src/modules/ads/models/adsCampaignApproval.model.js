const mongoose = require("mongoose");

const adsCampaignApprovalSchema = new mongoose.Schema(
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
    makerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    checkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    checkerComment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

adsCampaignApprovalSchema.index({ campaignId: 1, status: 1, createdAt: -1 });
adsCampaignApprovalSchema.index(
  { campaignId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } }
);

module.exports =
  mongoose.models.AdsCampaignApproval ||
  mongoose.model("AdsCampaignApproval", adsCampaignApprovalSchema);
