const preset = require("@dokanx/config/tailwind-preset.cjs");

module.exports = {
  presets: [preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../backend/packages/ui/src/**/*.{ts,tsx}"
  ]
};
