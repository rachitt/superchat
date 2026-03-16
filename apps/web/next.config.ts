import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${API_URL}/api/auth/:path*`,
      },
      {
        source: "/trpc/:path*",
        destination: `${API_URL}/trpc/:path*`,
      },
    ];
  },
};

export default nextConfig;
