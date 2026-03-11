const TaxRule = require('../../models/TaxRule');
const { toCSV } = require('../../utils/csv.util');
const vatReportService = require('@/modules/billing/vatReport.service');

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

  const updated = await TaxRule.findByIdAndUpdate(id, data, { returnDocument: "after" });
  res.json({ message: 'Tax rule updated', data: updated });
};

exports.vatSummary = async (req, res) => {
  const data = await vatReportService.getVatSummary({
    from: req.query.from || null,
    to: req.query.to || null,
    shopId: req.query.shopId || null,
  });
  res.json({ data });
};

exports.exportVatCSV = async (req, res) => {
  const rows = await vatReportService.buildVatExportRows({
    from: req.query.from || null,
    to: req.query.to || null,
    shopId: req.query.shopId || null,
    limit: req.query.limit || 1000,
  });

  const csv = toCSV(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="vat-report.csv"'
  );
  res.send(csv);
};

exports.getMushakInvoice = async (req, res) => {
  try {
    const data = await vatReportService.getMushakInvoiceData({
      orderId: req.params.orderId,
    });
    res.json({ data });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};
