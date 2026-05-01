const mongoose = require("mongoose");
const { createGlobalCustomerId } = require("../modules/customer/customer.identity.service");

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
  },
  normalizedPhone: {
    type: String,
    default: null,
    index: true,
  },
  globalCustomerId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    default: null,
  },
  customerIdentityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CustomerIdentity",
    default: null,
  },
  language: {
    type: String,
    default: "en",
  },
  pushTokens: {
    type: [String],
    default: [],
  },
  addresses: {
    type: [
      {
        id: { type: String, required: true },
        label: { type: String, default: "" },
        recipient: { type: String, default: "" },
        phone: { type: String, default: "" },
        line1: { type: String, default: "" },
        city: { type: String, default: "" },
        isDefault: { type: Boolean, default: false },
      },
    ],
    default: [],
  },
  savedPaymentMethods: {
    type: [
      {
        id: { type: String, required: true },
        label: { type: String, default: "" },
        provider: { type: String, default: "" },
        accountRef: { type: String, default: "" },
        isDefault: { type: Boolean, default: false },
      },
    ],
    default: [],
  },
  customerWallet: {
    cash: {
      type: Number,
      default: 0,
    },
    credit: {
      type: Number,
      default: 0,
    },
    bank: {
      type: Number,
      default: 0,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },

  password: {
    type: String,
    required: true,
    select: false,
  },

  role: {
    type: String,
    enum: ["ADMIN", "OWNER", "STAFF", "CUSTOMER", "DEVELOPER", "AGENT", "SUPER_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN", "AUDIT_ADMIN"],
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
  permissionOverrides: {
    type: [String],
    default: [],
  },
  invitationToken: {
    type: String,
    default: null,
  },
  invitationExpiresAt: {
    type: Date,
    default: null,
  },
  sessionVersion: {
    type: Number,
    default: 0,
  },
},
{
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true },
}
);

userSchema.pre("save", function ensureGlobalCustomerId() {
  if (this.role === "CUSTOMER" && !this.globalCustomerId) {
    this.globalCustomerId = createGlobalCustomerId();
  }

  if (this.phone) {
    this.normalizedPhone = String(this.phone).replace(/\D/g, "") || null;
  } else {
    this.normalizedPhone = null;
  }
});



module.exports = mongoose.models.User || mongoose.model("User", userSchema);
