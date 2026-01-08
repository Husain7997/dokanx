const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true }, // index already here
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

shopSchema.index({ owner: 1 });
// shopSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("Shop", shopSchema);
