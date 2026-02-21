const mongoose = require("mongoose");

const schema = new mongoose.Schema(
{
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
  },

  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
  },

  status: {
    type: String,
    enum: ["ACTIVE", "PAST_DUE", "CANCELLED"],
    default: "ACTIVE",
  },

  currentPeriodEnd: Date,
},
{ timestamps: true }
);

module.exports =
mongoose.model("Subscription", schema);
