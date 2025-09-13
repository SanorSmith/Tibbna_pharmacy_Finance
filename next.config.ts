import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add output configuration for Amplify
  output: 'standalone',
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb" // Increased from default 1MB to handle large invoice forms
    }
  }
};

export default nextConfig;
