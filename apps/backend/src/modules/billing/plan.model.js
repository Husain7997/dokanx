const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    smsQuota: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    limits: {
      shops: { type: Number, default: 1, min: 0 },
      products: { type: Number, default: 0, min: 0 },
      ordersPerMonth: { type: Number, default: 0, min: 0 },
      staff: { type: Number, default: 0, min: 0 },
      warehouses: { type: Number, default: 0, min: 0 },
    },
    features: {
      analytics: { type: Boolean, default: false },
      autoSettlement: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      pos: { type: Boolean, default: false },
      reports: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
      customDomain: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);



module.exports =
  mongoose.models.Plan ||
  mongoose.model("Plan", planSchema);
