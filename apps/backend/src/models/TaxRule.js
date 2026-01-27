const mongoose = require('mongoose');

const taxRuleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['VAT', 'WITHHOLDING', "PERCENTAGE"],
    required: true
  },
  rate: { type: Number, required: true }, // percentage, e.g., 15 for 15%
  name: { type: String, required: true },
  description: String,
  active: { type: Boolean, default: true }
});

// module.exports = mongoose.model('TaxRule', taxRuleSchema);

module.exports = mongoose.models.TaxRule || mongoose.model("TaxRule", taxRuleSchema);
