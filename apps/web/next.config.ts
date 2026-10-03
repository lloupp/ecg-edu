import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? { output: 'export', basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '/ecg-edu', trailingSlash: true } : {}),
  transpilePackages: ['@ecg-edu/shared'],
  images: {
    unoptimized: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
    remotePatterns: [],
  },
};

export default nextConfig;
