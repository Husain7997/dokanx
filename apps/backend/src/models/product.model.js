const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    index: true
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
productSchema.index({ shopId: 1, name: 1 });
productSchema.index({ shopId: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
