/** @type {import("next").NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: path.join(__dirname, "../../.."),
  allowedDevOrigins: [
    "http://127.0.0.1:4200",
    "http://127.0.0.1:4201",
    "http://127.0.0.1:3000",
    "http://localhost:4200",
    "http://localhost:4201",
    "http://localhost:3000",
  ],
  transpilePackages: [
    "@dokanx/ui",
    "@dokanx/api-client",
    "@dokanx/auth",
    "@dokanx/hooks",
  ],
};

module.exports = nextConfig;
