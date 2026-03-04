// src/core/language/index.js

const { t } = require("./translation.service");
const { resolveLanguage } = require("./language.resolver");
const { success, fail } = require("./response.builder");

module.exports = {
  t,
  resolveLanguage,
  success,
  fail,
};