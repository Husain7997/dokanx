const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({

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
    enum: ["debit", "credit"], // ✅ strict double entry
    required: true
  },

  referenceId: {
    type: String,
    required: true,
    index: true
  },

  meta: {
    type: Object,
    default: {}
  }

}, { timestamps: true });

function immutableQueryGuard() {
  throw new Error("Ledger immutable");
}

function immutableDeleteGuard() {
  throw new Error("Ledger delete forbidden");
}

function immutableSaveGuard(next) {
  if (!this.isNew) {
    return next(new Error("Ledger immutable"));
  }
  return next();
}

ledgerSchema.pre("save", immutableSaveGuard);
ledgerSchema.pre("updateOne", immutableQueryGuard);
ledgerSchema.pre("updateMany", immutableQueryGuard);
ledgerSchema.pre("findOneAndUpdate", immutableQueryGuard);
ledgerSchema.pre("replaceOne", immutableQueryGuard);
ledgerSchema.pre("findOneAndReplace", immutableQueryGuard);
ledgerSchema.pre("deleteOne", immutableDeleteGuard);
ledgerSchema.pre("deleteMany", immutableDeleteGuard);
ledgerSchema.pre("findOneAndDelete", immutableDeleteGuard);

module.exports = mongoose.model("Ledger", ledgerSchema);
