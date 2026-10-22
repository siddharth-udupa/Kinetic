import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Google's avatar hosts rotate between lh3-lh6, so allow the whole domain.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
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
