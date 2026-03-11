const { logger } = require("@/core/infrastructure");
const response = require("@/utils/controllerResponse");
const service = require("./backup.service");

exports.getBackupStrategy = async (req, res, next) => {
  try {
    return response.updated(res, req, service.getBackupStrategy());
  } catch (err) {
    return next(err);
  }
};

exports.getDisasterRecoveryProfile = async (req, res, next) => {
  try {
    return response.updated(res, req, service.getDisasterRecoveryProfile());
  } catch (err) {
    return next(err);
  }
};

exports.createBackupJob = async (req, res, next) => {
  try {
    const row = await service.createBackupJob({
      actorId: req.user?._id || null,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create backup job failed");
    return next(err);
  }
};

exports.listBackupJobs = async (req, res, next) => {
  try {
    const rows = await service.listBackupJobs(req.query);
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};

exports.updateBackupJobStatus = async (req, res) => {
  try {
    const row = await service.updateBackupJobStatus({
      jobId: req.params.jobId,
      actorId: req.user?._id || null,
      status: req.body.status,
      note: req.body.note || "",
    });
    return response.updated(res, req, row);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.createRestoreRequest = async (req, res, next) => {
  try {
    const row = await service.createRestoreRequest({
      actorId: req.user?._id || null,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create restore request failed");
    return next(err);
  }
};

exports.listRestoreRequests = async (req, res, next) => {
  try {
    const rows = await service.listRestoreRequests(req.query);
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};

exports.updateRestoreRequestStatus = async (req, res) => {
  try {
    const row = await service.updateRestoreRequestStatus({
      requestId: req.params.requestId,
      actorId: req.user?._id || null,
      status: req.body.status,
      note: req.body.note || "",
    });
    return response.updated(res, req, row);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};
