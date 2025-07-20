// frontend/next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: "export", // Enables static HTML export
  // Ensure basePath and assetPrefix match your GitHub repository name exactly.
  // If your repo is 'fyp' and your URL is 'https://<username>.github.io/fyp/', these are correct.
  basePath: isProd ? '/fyp' : '',
  assetPrefix: isProd ? '/fyp/' : '', // Ensure this has a trailing slash

  images: {
    unoptimized: true, // Disable Next.js Image Optimization as it needs a server for static export
  },

  // Add trailingSlash to ensure consistent URL structure for static files.
  trailingSlash: true, // IMPORTANT for GitHub Pages static exports

  // ACTIVATE THIS WEBPACK CONFIG FOR GITHUB PAGES STATIC DEPLOYMENT
  webpack: (config, { isServer }) => {
    // Only apply this publicPath change for client-side production builds
    // to ensure static assets are loaded correctly from the subpath.
    if (!isServer && isProd) {
      // This tells webpack where to find the assets relative to the base URL.
      // For GitHub Pages with a repository named 'fyp', the assets will be in '/fyp/_next/static/'.
      // So, the publicPath should be '/fyp/_next/'.
      config.output.publicPath = '/fyp/_next/';
    }
    return config;
  },
};

export default nextConfig;
