const TaxRule = require('../../models/TaxRule');

exports.listTaxRules = async (req, res) => {
  const rules = await TaxRule.find().sort({ type: 1 });
  res.json({ data: rules });
};

exports.createTaxRule = async (req, res) => {
  const { type, rate, name, description } = req.body;

  const rule = await TaxRule.create({ type, rate, name, description });
  res.json({ message: 'Tax rule created', data: rule });
};

exports.updateTaxRule = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const updated = await TaxRule.findByIdAndUpdate(id, data, { new: true });
  res.json({ message: 'Tax rule updated', data: updated });
};
