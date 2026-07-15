import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // INTERNAL_API_URL is a server-only env var set at container runtime.
    // It must point to the API service (e.g. http://api:8000 in docker-compose
    // or the API's public URL when deployed independently on Coolify).
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
