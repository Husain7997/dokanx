const mongoose = require("mongoose");

const ledgerSchema =
 new mongoose.Schema({

  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    index: true
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true
  },

  type: {
    type: String,
    enum: ["SALE", "EXPENSE", "REFUND", "PAYOUT", "COMMISSION", "ADJUSTMENT", "TOPUP", "TRANSFER", "LEGACY"],
    required: true,
    index: true
  },

  direction: {
    type: String,
    enum: ["CREDIT", "DEBIT"],
    required: true,
    default: function defaultDirection() {
      return Number(this.amount || 0) < 0 ? "DEBIT" : "CREDIT";
    }
  },

  referenceId: {
    type: String,
    required: true
  },

  referenceType: {
    type: String,
    enum: ["ORDER", "PAYOUT", "MANUAL", "REFUND", "COMMISSION", "EXPENSE"],
    default: "MANUAL",
    index: true
  },

  status: {
    type: String,
    enum: ["PENDING", "CONFIRMED", "CANCELLED"],
    default: "CONFIRMED",
    index: true
  },

  runningBalance: {
    type: Number,
    default: null
  },

  meta: {
    type: Object,
    default: {}
  }

}, { timestamps: true });

ledgerSchema.index(
  { shopId: 1, type: 1, referenceType: 1, referenceId: 1 }
);

ledgerSchema.pre("validate", function normalizeLedger() {
  if (!this.merchantId && this.shopId) this.merchantId = this.shopId;
  if (this.amount !== undefined) this.amount = Math.abs(Number(this.amount || 0));
  this.direction = String(this.direction || "").toUpperCase() || (Number(this.amount || 0) < 0 ? "DEBIT" : "CREDIT");
  this.status = String(this.status || "CONFIRMED").toUpperCase();
  this.referenceType = String(this.referenceType || "MANUAL").toUpperCase();
  const normalizedType = String(this.type || "LEGACY").toUpperCase();
  if (normalizedType === "CREDIT") {
    this.type = "ADJUSTMENT";
    this.direction = "CREDIT";
  } else if (normalizedType === "DEBIT") {
    this.type = "ADJUSTMENT";
    this.direction = "DEBIT";
  } else {
    this.type = normalizedType;
  }
});

ledgerSchema.pre("updateOne", () => {
  throw new Error("Ledger immutable");
});

ledgerSchema.pre("deleteOne", () => {
  throw new Error("Ledger delete forbidden");
});

module.exports =
 mongoose.models.Ledger ||
 mongoose.model("Ledger", ledgerSchema);
