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

  addresses: [
    {
      label: { type: String, default: "" },
      recipient: { type: String, default: "" },
      phone: { type: String, default: "" },
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      isDefault: { type: Boolean, default: false },
    },
  ],

  savedPaymentMethods: [
    {
      label: { type: String, default: "" },
      provider: { type: String, default: "" },
      accountRef: { type: String, default: "" },
      isDefault: { type: Boolean, default: false },
    },
  ],

  permissionOverrides: [
    {
      type: String,
      trim: true,
      uppercase: true,
    },
  ],
},
{ timestamps: true }
);



module.exports = mongoose.models.User || mongoose.model("User", userSchema);
