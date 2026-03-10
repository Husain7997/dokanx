const service = require("./catalogImport.service");
const { createAudit } = require("@/utils/audit.util");

async function uploadExcel(req, res, next) {
  try {
    const batch = await service.createUploadBatch({
      shopId: req.shop._id,
      userId: req.user._id,
      file: req.file,
    });

    await createAudit({
      action: "PRODUCT_IMPORT_BATCH_UPLOADED",
      performedBy: req.user._id,
      targetType: "ProductImportBatch",
      targetId: batch._id,
      req,
    });

    res.status(201).json({
      success: true,
      batchId: batch._id,
      summary: batch.summary,
      status: batch.status,
    });
  } catch (err) {
    next(err);
  }
}

async function previewImport(req, res, next) {
  try {
    const batch = await service.getBatchPreview({
      shopId: req.shop._id,
      batchId: req.params.batchId,
    });

    res.json({
      success: true,
      batchId: batch._id,
      status: batch.status,
      summary: batch.summary,
      mappedRows: batch.mappedRows,
    });
  } catch (err) {
    next(err);
  }
}

async function confirmImport(req, res, next) {
  try {
    const result = await service.confirmImport({
      shopId: req.shop._id,
      batchId: req.params.batchId,
      idempotencyKey: req.headers["idempotency-key"] || null,
    });
    const batch = result.batch;

    await createAudit({
      action: "PRODUCT_IMPORT_BATCH_CONFIRMED",
      performedBy: req.user._id,
      targetType: "ProductImportBatch",
      targetId: batch._id,
      req,
    });

    res.json({
      success: true,
      batchId: batch._id,
      status: batch.status,
      summary: batch.summary,
      confirmedAt: batch.confirmedAt,
      idempotencyReplay: result.idempotencyReplay,
      replayedFromBatchId: result.replayedFromBatchId,
    });
  } catch (err) {
    next(err);
  }
}

async function errorReport(req, res, next) {
  try {
    const report = await service.getBatchErrorReport({
      shopId: req.shop._id,
      batchId: req.params.batchId,
    });

    res.json({
      success: true,
      ...report,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadExcel,
  previewImport,
  confirmImport,
  errorReport,
};
