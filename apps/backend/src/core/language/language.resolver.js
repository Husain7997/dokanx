// src/core/language/language.resolver.js

const supported = ["en", "bn"];

function resolveLanguage(req) {
  const lang =
    req.headers["x-lang"] ||
    req.headers["accept-language"] ||
    "en";

  const normalized =
    lang.split(",")[0].toLowerCase();

  return supported.includes(normalized)
    ? normalized
    : "en";
}

module.exports = { resolveLanguage };