/** @type {import("next").NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: path.join(__dirname, "../../.."),
  experimental: {
    workerThreads: false,
    webpackBuildWorker: false,
  },
  allowedDevOrigins: [
    "http://127.0.0.1:4100",
    "http://127.0.0.1:4101",
    "http://127.0.0.1:3000",
    "http://localhost:4100",
    "http://localhost:4101",
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
