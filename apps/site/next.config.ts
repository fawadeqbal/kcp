import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { securityHeaders } from './src/lib/security-headers';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003';

const nextConfig: NextConfig = {
  // Self-contained server output for Docker; ignored by Vercel.
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders({
          apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
          dev: process.env.NODE_ENV === 'development',
          upgradeInsecureRequests: siteUrl.startsWith('https://'),
        }),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
