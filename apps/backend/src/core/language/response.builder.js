// src/core/language/response.builder.js

const { t } = require("./translation.service");

function success(res, key, data = {}, vars = {}) {
  return res.json({
    success: true,
    message: t(res.req.lang || "en", key, vars),
    data,
  });
}

function fail(res, key, status = 400, vars = {}) {
  return res.status(status).json({
    success: false,
    message: t(res.req.lang || "en", key, vars),
  });
}

module.exports = { success, fail };