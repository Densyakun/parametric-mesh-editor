import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['ts-morph', 'tsx-safe-eval'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
