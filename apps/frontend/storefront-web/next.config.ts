import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: [
    "http://127.0.0.1:4100",
    "http://127.0.0.1:4101",
    "http://127.0.0.1:3000",
    "http://localhost:4100",
    "http://localhost:4101",
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
