import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@repo/db",
    "@repo/gpx",
    "@repo/shared",
    "@repo/types",
    "@repo/validation",
    "@repo/units",
  ],
};

export default nextConfig;
