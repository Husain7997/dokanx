const preset = require("@dokanx/config/tailwind-preset.cjs");

module.exports = {
  presets: [preset],
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/**/*.{js,jsx,ts,tsx,mdx}",
    "../../backend/packages/ui/src/**/*.{js,jsx,ts,tsx,mdx}"
  ]
};
