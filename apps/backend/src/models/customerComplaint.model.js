const mongoose = require("mongoose");

const customerComplaintSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    globalCustomerId: { type: String, default: "" },
    title: { type: String, required: true },
    detail: { type: String, default: "" },
    channel: { type: String, default: "STORE" },
    status: { type: String, enum: ["OPEN", "RESOLVED"], default: "OPEN" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.CustomerComplaint || mongoose.model("CustomerComplaint", customerComplaintSchema);
