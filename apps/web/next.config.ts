import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ecg-edu/shared'],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
