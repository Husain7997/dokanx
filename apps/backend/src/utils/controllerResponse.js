const { t } = require("@/core/infrastructure");

function send(res, status, payload) {
  if (typeof res.status === "function") {
    return res.status(status).json(payload);
  }
  return res.json(payload);
}

function updated(res, req, data, status = 200) {
  return send(res, status, {
    message: t("common.updated", req.lang),
    data,
  });
}

function message(res, messageText, data = undefined, status = 200) {
  const payload = { message: messageText };
  if (data !== undefined) {
    payload.data = data;
  }
  return send(res, status, payload);
}

function success(res, data = undefined, status = 200) {
  const payload = { success: true };
  if (data !== undefined) {
    Object.assign(payload, data);
  }
  return send(res, status, payload);
}

function failure(res, messageText, status = 400, extra = {}) {
  return res.status(status).json({
    success: false,
    message: messageText,
    ...extra,
  });
}

function notFound(res, entity) {
  return failure(res, `${entity} not found`, 404);
}

module.exports = {
  updated,
  message,
  success,
  failure,
  notFound,
};
