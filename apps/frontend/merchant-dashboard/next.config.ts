import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: [
    "@dokanx/ui",
    "@dokanx/api-client",
    "@dokanx/auth",
    "@dokanx/hooks"
  ]
};

export default nextConfig;
