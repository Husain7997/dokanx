const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      enum: ["MAIN_STORE", "WAREHOUSE", "PARTNER_STORE"],
      default: "WAREHOUSE",
    },
    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 240,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

schema.index({ shopId: 1, code: 1 }, { unique: true, sparse: true });
schema.index({ shopId: 1, name: 1 });


module.exports =
  mongoose.models.Warehouse ||
  mongoose.model("Warehouse", schema);
