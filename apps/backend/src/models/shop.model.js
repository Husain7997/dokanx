const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    name: String,
    domain: String,
    owner: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  {
    timestamps: true,
    bufferCommands: false, // 🔥 THIS IS THE FIX
  }
);

// module.exports = mongoose.model("Shop", shopSchema);

module.exports =
  mongoose.models.Shop ||
  mongoose.model('Shop', shopSchema);


// const mongoose = require("mongoose");

// const shopSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     slug: { type: String, unique: true }, // index already here
//     owner: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     blockedCustomers: [
//   {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User"
//   }
// ],
//     isActive: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// shopSchema.index({ owner: 1 });
// // shopSchema.index({ slug: 1 }, { unique: true });
// module.exports =  mongoose.models.Shop || mongoose.model("Shop", shopSchema);

