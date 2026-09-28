import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // confirme à Next 16 que la config webpack de Serwist est volontaire
  async rewrites() {
    if (!apiUrl) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default withSerwist(nextConfig);