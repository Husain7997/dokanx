const mongoose = require("mongoose");

const agentReferralEventSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["CLICK", "SIGNUP", "SHOP_CONVERSION", "SHOP_PAYMENT_ALERT", "FIRST_EARNING"],
      required: true,
      index: true,
    },
    agentCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AgentLead",
      default: null,
    },
    metadata: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AgentReferralEvent ||
  mongoose.model("AgentReferralEvent", agentReferralEventSchema);
