const Module = require("module");

const builtins = new Set(
  Module.builtinModules.map(m => m.replace(/^node:/, ""))
);

module.exports = (request, options) => {
  const normalized = request.startsWith("node:")
    ? request.slice(5)
    : request;

  if (builtins.has(normalized)) {
    return options.defaultResolver(normalized, options);
  }

  return options.defaultResolver(normalized, options);
};
