import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@dokanx/ui",
    "@dokanx/api-client",
    "@dokanx/auth",
    "@dokanx/hooks"
  ]
};

export default nextConfig;
