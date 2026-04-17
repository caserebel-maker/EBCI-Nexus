import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cluirxjykhchthcpgosz.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'cluirxjykhchthcpgosz.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
    // Vercel Limit Optimization: 
    // Device sizes: 640, 750, 828, 1080, 1200, 1920, 2048, 3840 (Default)
    // Reduce to common sizes to save bandwidth/generation time
    deviceSizes: [640, 750, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
