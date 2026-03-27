const mongoose = require("mongoose");

const agentLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    experience: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "facebook",
      trim: true,
    },
    status: {
      type: String,
      enum: ["NEW", "CONVERTED", "REJECTED"],
      default: "NEW",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
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
  mongoose.models.AgentLead || mongoose.model("AgentLead", agentLeadSchema);
