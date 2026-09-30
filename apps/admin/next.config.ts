import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained server output for Docker; ignored by Vercel.
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // The Content-Security-Policy (with a nonce per page) is set in src/proxy.ts.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Browsers ignore it over plain http (local development).
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // The admin panel must never appear in search results.
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
