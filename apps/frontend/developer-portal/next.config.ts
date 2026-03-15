import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: [
    "http://127.0.0.1:4300",
    "http://127.0.0.1:4301",
    "http://127.0.0.1:3000",
    "http://localhost:4300",
    "http://localhost:4301",
    "http://localhost:3000"
  ],
  transpilePackages: [
    "@dokanx/ui",
    "@dokanx/api-client",
    "@dokanx/auth",
    "@dokanx/hooks"
  ]
};

export default nextConfig;
