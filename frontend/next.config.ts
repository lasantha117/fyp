// frontend/next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: "export", // Enables static HTML export
  basePath: isProd ? '/fyp' : '', // UPDATED: Repository name is 'fyp'
  assetPrefix: isProd ? '/fyp/' : '', // UPDATED: Repository name is 'fyp'
  images: {
    unoptimized: true, // Disable Next.js Image Optimization as it needs a server
  },
};

export default nextConfig;