import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // One-time confirmation links from waitlist emails.
      disallow: '/*/waitlist/confirm',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
