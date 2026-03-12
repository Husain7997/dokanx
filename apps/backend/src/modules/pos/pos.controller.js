const service = require("./pos.service");

async function openSession(req, res, next) {
  try {
    const row = await service.openSession({
      shopId: req.shop._id,
      terminalId: req.body.terminalId,
      openedBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      data: row,
    });
  } catch (err) {
    return next(err);
  }
}

async function closeSession(req, res, next) {
  try {
    const row = await service.closeSession({
      shopId: req.shop._id,
      terminalId: req.params.terminalId,
    });

    return res.json({
      success: true,
      data: row,
    });
  } catch (err) {
    return next(err);
  }
}

async function listSessions(req, res, next) {
  try {
    const rows = await service.listSessions({
      shopId: req.shop._id,
      status: req.query.status,
    });

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    return next(err);
  }
}

async function enqueueOfflineSale(req, res, next) {
  try {
    const result = await service.enqueueOfflineSale({
      shopId: req.shop._id,
      terminalId: req.body.terminalId,
      clientMutationId: req.body.clientMutationId,
      payload: {
        items: req.body.items,
        totals: req.body.totals || {},
        customer: req.body.customer || {},
        note: req.body.note || "",
      },
      paymentTypes: req.body.paymentTypes,
    });

    return res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: result.duplicate,
      data: result.queueItem,
    });
  } catch (err) {
    return next(err);
  }
}

async function listOfflineQueue(req, res, next) {
  try {
    const rows = await service.listOfflineQueue({
      shopId: req.shop._id,
      terminalId: req.query.terminalId,
      status: req.query.status,
    });

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    return next(err);
  }
}

async function syncOfflineQueue(req, res, next) {
  try {
    const result = await service.syncOfflineQueue({
      shopId: req.shop._id,
      terminalId: req.body.terminalId || "",
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  openSession,
  closeSession,
  listSessions,
  enqueueOfflineSale,
  listOfflineQueue,
  syncOfflineQueue,
};
