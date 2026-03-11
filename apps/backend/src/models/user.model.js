const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },

  phone: {
    type: String,
    default: null,
    unique: true,
    sparse: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
    select: false,
  },

  role: {
    type: String,
    enum: ["ADMIN", "OWNER", "STAFF", "CUSTOMER"],
    default: "CUSTOMER",
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    default: null,
  },

  isBlocked: {
    type: Boolean,
    default: false,
  },
},
{ timestamps: true }
);



module.exports = mongoose.models.User || mongoose.model("User", userSchema);
