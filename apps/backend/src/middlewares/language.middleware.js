const {
  resolveLanguage,
} = require("@/core/language/language.resolver");

module.exports = function language(req, res, next) {

  req.lang = resolveLanguage(req);

  next();
};