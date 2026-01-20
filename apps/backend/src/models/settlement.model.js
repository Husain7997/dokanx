const SettlementSchema = new Schema({
  tenant: { type: ObjectId, ref: "Tenant", index: true },
  shop: { type: ObjectId, ref: "Shop", index: true },

  order: { type: ObjectId, ref: "Order" },
  payment: { type: ObjectId, ref: "Payment" },

  gross_amount: Number,
  commission_amount: Number,
  net_amount: Number,

  status: {
    type: String,
    enum: ["PENDING", "MATURED", "SETTLED", "CANCELLED"],
    default: "PENDING"
  },

  mature_at: Date,
  settled_at: Date,

  idempotency_key: { type: String, unique: true },

}, { timestamps: true });
module.exports = mongoose.model("Settlement", SettlementSchema);