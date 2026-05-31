import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ltmauzprtdhwlmcvprzj.supabase.co",
      },
    ],
  },
};

export default nextConfig;
