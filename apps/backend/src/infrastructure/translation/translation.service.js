const fs = require("fs");
const path = require("path");

const cache = {};

function load(lang) {

  if (cache[lang]) return cache[lang];

  const file = path.join(
    __dirname,
    "locales",
    `${lang}.json`
  );

  if (!fs.existsSync(file))
    return {};

  cache[lang] = JSON.parse(
    fs.readFileSync(file, "utf8")
  );

  return cache[lang];
}

function interpolate(str, vars) {

  return str.replace(
    /\{\{(.*?)\}\}/g,
    (_, key) => vars[key.trim()] ?? ""
  );
}

function t(lang, key, vars = {}) {

  const dict = load(lang);

  const value =
    key.split(".")
      .reduce((o, i) => o?.[i], dict) ||
    key;

  return interpolate(value, vars);
}

module.exports = { t };